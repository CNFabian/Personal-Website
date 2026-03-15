// ============================================================
// services/ai.js — Claude AI integration for PM intelligence
// ============================================================
// Processes raw data from Slack, Gmail, and GitHub through
// Claude to extract structured task intelligence.
//
// Conservative mode: AI suggests, never auto-acts.
// ============================================================

const { getDb } = require('../db');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// ---- API Helper ----

async function claudeChat(systemPrompt, userMessage, maxTokens = 1024) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

/**
 * Parse JSON from Claude's response, handling markdown code blocks
 */
function parseAIResponse(text) {
  // Remove markdown code blocks if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ---- Slack Message Analysis ----

const SLACK_ANALYSIS_SYSTEM = `You are an AI assistant analyzing Slack messages from a software engineering team.
For each message, extract structured data. Return valid JSON only.

For each message in the array, return:
{
  "user_name": "string",
  "activity_type": "status_update" | "blocker" | "question" | "announcement" | "pr_mention" | "deploy" | "review_request" | "casual",
  "task_reference": "string or null — any feature, task, or project mentioned",
  "blocker": "string or null — what they're blocked on, if anything",
  "sentiment": "positive" | "neutral" | "frustrated" | "urgent",
  "summary": "one clear sentence summarizing the message",
  "action_needed": "string or null — what the PM should do, if anything"
}

Rules:
- Be conservative. Only flag "blocker" if the person explicitly says they're stuck, waiting, or blocked.
- "casual" means the message isn't work-related (greetings, jokes, lunch plans).
- "action_needed" should be specific: "Check in with Sarah about the API spec" not "Follow up".
- task_reference should match project/feature names, not generic words.

Return a JSON array matching the input array order.`;

/**
 * Analyze a batch of Slack messages
 */
async function analyzeSlackMessages(messages) {
  if (messages.length === 0) return [];

  const formatted = messages.map(m => ({
    user_name: m.user_name || 'Unknown',
    text: m.text || m.summary || '',
    timestamp: m.timestamp,
  }));

  try {
    const response = await claudeChat(
      SLACK_ANALYSIS_SYSTEM,
      JSON.stringify(formatted),
      2048
    );
    return parseAIResponse(response);
  } catch (err) {
    console.error('[ai] Error analyzing Slack messages:', err.message);
    return messages.map(() => ({
      activity_type: 'casual',
      task_reference: null,
      blocker: null,
      sentiment: 'neutral',
      summary: 'Could not analyze',
      action_needed: null,
    }));
  }
}

// ---- Gmail Email Analysis ----

const EMAIL_ANALYSIS_SYSTEM = `You are an AI assistant helping a PM process emails from their CEO and stakeholders.
For each email, extract structured data. Return valid JSON only.

{
  "summary": "2-3 sentence summary of the email's key points",
  "action_items": ["array of specific action items for the PM team"],
  "priority_impact": "none" | "low" | "medium" | "high" | "critical",
  "category": "directive" | "question" | "fyi" | "feedback" | "deadline" | "approval",
  "deadline_mentioned": "string or null — any deadline or timeframe mentioned",
  "affected_tasks": ["array of task/feature names that might be affected"],
  "suggested_response": "string or null — brief suggested reply if a response is needed"
}

Rules:
- Be concise. The PM needs to scan these quickly.
- "directive" means the CEO is telling the team to do something.
- "priority_impact" reflects how much this should change the team's current priorities.
- Only include action_items that are clear and actionable, not vague suggestions.
- affected_tasks should reference specific features or workstreams if mentioned.`;

/**
 * Analyze an email from CEO/stakeholders
 */
async function analyzeEmail(email) {
  try {
    const response = await claudeChat(
      EMAIL_ANALYSIS_SYSTEM,
      JSON.stringify({
        from: email.from,
        subject: email.subject,
        body: email.body?.substring(0, 3000), // limit context size
        date: email.date,
      }),
      1024
    );
    return parseAIResponse(response);
  } catch (err) {
    console.error('[ai] Error analyzing email:', err.message);
    return {
      summary: 'Could not analyze email',
      action_items: [],
      priority_impact: 'none',
      category: 'fyi',
      deadline_mentioned: null,
      affected_tasks: [],
      suggested_response: null,
    };
  }
}

// ---- Task Risk Analysis ----

const RISK_ANALYSIS_SYSTEM = `You are an AI assistant helping a PM assess project risk.
Given a task and its associated activity data, assess the risk level.
Return valid JSON only.

{
  "risk_score": 0.0 to 1.0,
  "risk_level": "low" | "medium" | "high" | "critical",
  "factors": ["array of risk factors identified"],
  "suggested_action": "what the PM should do about this",
  "confidence": 0.0 to 1.0
}

Risk factors to consider:
- Time: How long has the task been in its current status vs estimated time?
- Activity: Is there recent GitHub/Slack activity related to this task?
- Blockers: Are there any unresolved blockers?
- Dependencies: Is this blocking other work?
- Communication: Has there been silence about this task?
- Complexity: Does the description suggest high technical uncertainty?

Scoring guide:
- 0-0.25: Low risk. On track, normal progress.
- 0.25-0.5: Medium risk. Needs attention but not urgent.
- 0.5-0.75: High risk. Likely to miss target without intervention.
- 0.75-1.0: Critical. Already impacting other work or significantly overdue.`;

/**
 * Analyze risk for a specific task
 */
async function analyzeTaskRisk(task, recentActivity = []) {
  const now = new Date();
  const startedAt = task.started_at ? new Date(task.started_at) : null;
  const daysInStatus = startedAt
    ? Math.floor((now - startedAt) / (1000 * 60 * 60 * 24))
    : 0;

  try {
    const response = await claudeChat(
      RISK_ANALYSIS_SYSTEM,
      JSON.stringify({
        task: {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          actual_hours: task.actual_hours,
          days_in_current_status: daysInStatus,
          assignee: task.assignee_name,
        },
        recent_activity: recentActivity.slice(0, 10).map(a => ({
          type: a.activity_type,
          source: a.source,
          summary: a.summary,
          timestamp: a.timestamp,
        })),
        context: {
          current_date: now.toISOString(),
        },
      }),
      512
    );

    return parseAIResponse(response);
  } catch (err) {
    console.error(`[ai] Error analyzing risk for task ${task.id}:`, err.message);
    return {
      risk_score: 0,
      risk_level: 'low',
      factors: ['Could not analyze'],
      suggested_action: 'Manual review needed',
      confidence: 0,
    };
  }
}

// ---- PM Chat Assistant ----

/**
 * Chat with the PM assistant. Has full context of team data.
 */
async function pmChat(userMessage, conversationHistory = []) {
  const db = getDb();

  // Build context from current database state
  const teamMembers = db.prepare(
    'SELECT id, name, role, is_active FROM pm_team_members WHERE is_active = 1'
  ).all();

  const activeTasks = db.prepare(
    `SELECT t.*, m.name AS assignee_name
     FROM pm_tasks t
     LEFT JOIN pm_team_members m ON t.assignee_id = m.id
     WHERE t.status != 'DONE'
     ORDER BY t.priority DESC, t.updated_at DESC`
  ).all();

  const recentActivity = db.prepare(
    `SELECT a.*, m.name AS member_name
     FROM pm_activity a
     LEFT JOIN pm_team_members m ON a.member_id = m.id
     ORDER BY a.timestamp DESC LIMIT 30`
  ).all();

  const activeAlerts = db.prepare(
    `SELECT * FROM pm_alerts WHERE is_acknowledged = 0
     ORDER BY severity DESC, created_at DESC`
  ).all();

  const systemPrompt = `You are an expert PM assistant for Chris, an APM managing a 6-15 person engineering team building NestNavigate (a homebuying education platform).

You have access to the current project state:

TEAM (${teamMembers.length} active members):
${teamMembers.map(m => `- ${m.name} (${m.role})`).join('\n')}

ACTIVE TASKS (${activeTasks.length}):
${activeTasks.map(t => `- [${t.status}] ${t.title} — assigned to ${t.assignee_name || 'unassigned'} (${t.priority} priority)`).join('\n')}

RECENT ACTIVITY (last 30 events):
${recentActivity.map(a => `- [${a.source}] ${a.member_name || 'System'}: ${a.summary || a.title} (${a.timestamp})`).join('\n')}

ACTIVE ALERTS (${activeAlerts.length}):
${activeAlerts.map(a => `- [${a.severity}] ${a.message}`).join('\n')}

GUIDELINES:
- Be concise and actionable. Chris is busy.
- When suggesting actions, be specific: name the person, the task, and what to do.
- Never auto-act. Always present options for Chris to decide.
- Use data from the context above to support your answers.
- If asked to draft a message, use a professional but warm tone.
- If you don't have enough data to answer, say so clearly.
- Current date: ${new Date().toISOString().split('T')[0]}`;

  // Build messages array with history
  const messages = [
    ...conversationHistory.map(h => ({
      role: h.role,
      content: h.message,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude API ${res.status}: ${body}`);
    }

    const data = await res.json();
    const assistantMessage = data.content[0].text;

    // Save to chat history
    db.prepare(
      "INSERT INTO pm_chat_history (role, message) VALUES ('user', ?)"
    ).run(userMessage);
    db.prepare(
      "INSERT INTO pm_chat_history (role, message) VALUES ('assistant', ?)"
    ).run(assistantMessage);

    return assistantMessage;
  } catch (err) {
    console.error('[ai] PM chat error:', err.message);
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
}

// ---- Batch Analysis (Run on Schedule) ----

/**
 * Run full analysis: process new Slack messages, assess task risks, generate alerts.
 * Call this every 30-60 minutes.
 */
async function runFullAnalysis() {
  const db = getDb();
  const results = { slack_analyzed: 0, risks_assessed: 0, alerts_generated: 0 };

  // 1. Analyze recent unprocessed Slack messages
  const slackMessages = db.prepare(
    `SELECT a.*, m.name AS member_name
     FROM pm_activity a
     LEFT JOIN pm_team_members m ON a.member_id = m.id
     WHERE a.source = 'slack' AND a.activity_type = 'message'
     ORDER BY a.timestamp DESC LIMIT 30`
  ).all();

  if (slackMessages.length > 0) {
    const formatted = slackMessages.map(m => ({
      user_name: m.member_name || 'Unknown',
      text: m.summary,
      timestamp: m.timestamp,
    }));

    const analyses = await analyzeSlackMessages(formatted);
    results.slack_analyzed = analyses.length;

    // Check for blockers and generate alerts
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      const msg = slackMessages[i];

      if (analysis.blocker && msg.member_id) {
        // Check if we already have a recent blocker alert for this person
        const existingAlert = db.prepare(
          `SELECT id FROM pm_alerts
           WHERE member_id = ? AND alert_type = 'blocker' AND is_acknowledged = 0
           AND created_at > datetime('now', '-1 day')`
        ).get(msg.member_id);

        if (!existingAlert) {
          db.prepare(
            `INSERT INTO pm_alerts (member_id, alert_type, severity, message, suggested_action)
             VALUES (?, 'blocker', 'high', ?, ?)`
          ).run(
            msg.member_id,
            `${msg.member_name || 'Team member'} appears blocked: ${analysis.blocker}`,
            analysis.action_needed || 'Check in with them to understand and unblock'
          );
          results.alerts_generated++;
        }
      }
    }
  }

  // 2. Assess risk for in-progress tasks
  const activeTasks = db.prepare(
    `SELECT t.*, m.name AS assignee_name
     FROM pm_tasks t
     LEFT JOIN pm_team_members m ON t.assignee_id = m.id
     WHERE t.status IN ('IN_PROGRESS', 'IN_REVIEW')`
  ).all();

  for (const task of activeTasks) {
    const activity = db.prepare(
      `SELECT * FROM pm_activity
       WHERE (member_id = ? OR task_id = ?)
       ORDER BY timestamp DESC LIMIT 10`
    ).all(task.assignee_id, task.id);

    const risk = await analyzeTaskRisk(task, activity);

    // Update task risk score
    db.prepare(
      'UPDATE pm_tasks SET ai_risk_score = ?, ai_status_confidence = ? WHERE id = ?'
    ).run(risk.risk_score, risk.confidence, task.id);

    results.risks_assessed++;

    // Generate alert if risk is high
    if (risk.risk_score >= 0.5) {
      const severity = risk.risk_score >= 0.75 ? 'critical' : 'high';

      // Check for existing unacknowledged alert for this task
      const existingAlert = db.prepare(
        `SELECT id FROM pm_alerts
         WHERE task_id = ? AND alert_type = 'stale_task' AND is_acknowledged = 0`
      ).get(task.id);

      if (!existingAlert) {
        db.prepare(
          `INSERT INTO pm_alerts (task_id, member_id, alert_type, severity, message, suggested_action)
           VALUES (?, ?, 'stale_task', ?, ?, ?)`
        ).run(
          task.id,
          task.assignee_id,
          severity,
          `"${task.title}" risk level: ${risk.risk_level}. Factors: ${risk.factors.join(', ')}`,
          risk.suggested_action
        );
        results.alerts_generated++;
      }
    }

    // Respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[ai] Analysis complete:`, results);
  return results;
}

module.exports = {
  analyzeSlackMessages,
  analyzeEmail,
  analyzeTaskRisk,
  pmChat,
  runFullAnalysis,
};
