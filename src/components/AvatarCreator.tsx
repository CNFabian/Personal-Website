import React, { useState, useRef, useEffect, useCallback } from 'react';

// Avatar data model
export interface AvatarData {
  body: number;
  skinColor: string;
  hair: number;
  hairColor: string;
  eyes: number;
  top: number;
  topColor: string;
  bottom: number;
  bottomColor: string;
  hat: number;
  hatColor: string;
}

// Default avatar configuration
const DEFAULT_AVATAR: AvatarData = {
  body: 0,
  skinColor: '#E8B48A',
  hair: 0,
  hairColor: '#3D2817',
  eyes: 0,
  top: 0,
  topColor: '#E94560',
  bottom: 0,
  bottomColor: '#2C3E50',
  hat: -1,
  hatColor: '#FFD700',
};

// Color palettes for different categories
const SKIN_COLORS = ['#FFD9B3', '#E8B48A', '#D4A574', '#BC8F51', '#8B4513', '#704214', '#553A1B', '#3E2723'];
const HAIR_COLORS = ['#3D2817', '#8B4513', '#D4A574', '#C41E3A', '#FFD700', '#FF69B4', '#00CED1', '#9370DB'];
const CLOTH_COLORS = ['#E94560', '#0f3460', '#16213e', '#FFD700', '#2C3E50', '#34495E', '#27AE60', '#8E44AD'];

// Component props
interface AvatarCreatorProps {
  onSave: (avatarData: AvatarData) => void;
  onCancel?: () => void;
  initialData?: AvatarData | null;
}

const AvatarCreator: React.FC<AvatarCreatorProps> = ({
  onSave,
  onCancel,
  initialData = null,
}) => {
  const [avatarData, setAvatarData] = useState<AvatarData>(
    initialData || { ...DEFAULT_AVATAR }
  );
  const [activeTab, setActiveTab] = useState<'body' | 'hair' | 'face' | 'clothing' | 'accessories'>('body');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw avatar on canvas
  const drawAvatar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 1. Draw Body (rounded rectangle for torso + circle for head)
    ctx.fillStyle = avatarData.skinColor;

    // Head (circle)
    ctx.beginPath();
    ctx.arc(centerX, centerY - 60, 35, 0, Math.PI * 2);
    ctx.fill();

    // Torso (rounded rectangle)
    ctx.beginPath();
    ctx.moveTo(centerX - 30, centerY - 25);
    ctx.lineTo(centerX + 30, centerY - 25);
    ctx.quadraticCurveTo(centerX + 35, centerY, centerX + 30, centerY + 40);
    ctx.lineTo(centerX - 30, centerY + 40);
    ctx.quadraticCurveTo(centerX - 35, centerY, centerX - 30, centerY - 25);
    ctx.fill();

    // 2. Draw Bottom clothing (rectangle below torso)
    ctx.fillStyle = avatarData.bottomColor;
    ctx.fillRect(centerX - 32, centerY + 38, 64, 45);

    // Add pattern/details based on bottom index
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    if (avatarData.bottom === 1) {
      // Striped pattern
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(centerX - 32 + i * 16, centerY + 38, 8, 45);
      }
    } else if (avatarData.bottom === 2) {
      // Pockets
      ctx.fillRect(centerX - 20, centerY + 50, 12, 15);
      ctx.fillRect(centerX + 8, centerY + 50, 12, 15);
    }

    // 3. Draw Top clothing (rectangle on torso)
    ctx.fillStyle = avatarData.topColor;
    ctx.fillRect(centerX - 32, centerY - 20, 64, 38);

    // Add pattern/details based on top index
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    if (avatarData.top === 1) {
      // Striped pattern
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(centerX - 32 + i * 16, centerY - 20, 8, 38);
      }
    } else if (avatarData.top === 2) {
      // Buttons
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX, centerY + 8, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (avatarData.top === 3) {
      // Polka dots
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.arc(centerX - 20 + i * 15, centerY - 10 + j * 15, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Draw Hair (various styles)
    ctx.fillStyle = avatarData.hairColor;
    const hairY = centerY - 95;

    if (avatarData.hair === 0) {
      // Short hair
      ctx.beginPath();
      ctx.arc(centerX, hairY + 35, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(centerX - 38, hairY + 10, 76, 30);
    } else if (avatarData.hair === 1) {
      // Long hair
      ctx.beginPath();
      ctx.arc(centerX, hairY + 35, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(centerX - 42, hairY - 5, 84, 80);
    } else if (avatarData.hair === 2) {
      // Curly/afro
      ctx.beginPath();
      ctx.arc(centerX, hairY + 35, 45, 0, Math.PI * 2);
      ctx.fill();
      // Add texture
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * 40;
        const y = hairY + 35 + Math.sin(angle) * 40;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (avatarData.hair === 3) {
      // Spiky hair
      ctx.fillStyle = avatarData.hairColor;
      ctx.beginPath();
      ctx.arc(centerX, hairY + 35, 35, 0, Math.PI * 2);
      ctx.fill();
      // Spikes
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spikeX = centerX + Math.cos(angle) * 35;
        const spikeY = hairY + 35 + Math.sin(angle) * 35;
        const tipX = centerX + Math.cos(angle) * 55;
        const tipY = hairY + 35 + Math.sin(angle) * 55;
        ctx.beginPath();
        ctx.moveTo(spikeX, spikeY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(spikeX + 5, spikeY);
        ctx.fill();
      }
    } else if (avatarData.hair === 4) {
      // Side part
      ctx.beginPath();
      ctx.arc(centerX - 5, hairY + 35, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(centerX - 40, hairY - 5, 75, 50);
    } else if (avatarData.hair === 5) {
      // Ponytail
      ctx.beginPath();
      ctx.arc(centerX, hairY + 35, 35, 0, Math.PI * 2);
      ctx.fill();
      // Ponytail
      ctx.fillRect(centerX + 20, hairY + 40, 15, 50);
    } else if (avatarData.hair === 6) {
      // Twin buns
      ctx.beginPath();
      ctx.arc(centerX - 20, hairY + 25, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 20, hairY + 25, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(centerX - 35, hairY + 35, 70, 25);
    } else if (avatarData.hair === 7) {
      // Bald/minimal
      ctx.beginPath();
      ctx.arc(centerX, hairY + 35, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Draw Hat (if selected)
    if (avatarData.hat >= 0) {
      ctx.fillStyle = avatarData.hatColor;

      if (avatarData.hat === 0) {
        // Top hat
        ctx.fillRect(centerX - 20, hairY - 30, 40, 15);
        ctx.fillRect(centerX - 28, hairY - 10, 56, 8);
      } else if (avatarData.hat === 1) {
        // Cowboy hat
        ctx.beginPath();
        ctx.ellipse(centerX, hairY + 8, 50, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, hairY - 5, 20, 0, Math.PI * 2);
        ctx.fill();
      } else if (avatarData.hat === 2) {
        // Beanie
        ctx.beginPath();
        ctx.arc(centerX, hairY + 10, 32, 0, Math.PI, true);
        ctx.fill();
        ctx.fillRect(centerX - 32, hairY + 10, 64, 8);
      } else if (avatarData.hat === 3) {
        // Crown
        ctx.fillRect(centerX - 30, hairY + 10, 60, 8);
        // Spikes
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(centerX - 25 + i * 12.5, hairY + 8, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6. Draw Eyes
    ctx.fillStyle = '#FFFFFF';
    const eyeY = centerY - 70;

    if (avatarData.eyes === 0) {
      // Classic round eyes
      ctx.beginPath();
      ctx.arc(centerX - 12, eyeY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 12, eyeY, 6, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX - 12, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 12, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (avatarData.eyes === 1) {
      // Happy/crescent eyes
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX - 12, eyeY, 6, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX + 12, eyeY, 6, 0, Math.PI, true);
      ctx.stroke();
    } else if (avatarData.eyes === 2) {
      // Angry eyes
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 18, eyeY - 4);
      ctx.lineTo(centerX - 6, eyeY + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX + 6, eyeY - 4);
      ctx.lineTo(centerX + 18, eyeY + 4);
      ctx.stroke();
    } else if (avatarData.eyes === 3) {
      // Star eyes
      const starSize = 5;
      const drawStar = (x: number, y: number) => {
        const points = 5;
        const outerRadius = starSize;
        const innerRadius = starSize / 2;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      };
      ctx.fillStyle = '#FFD700';
      drawStar(centerX - 12, eyeY);
      drawStar(centerX + 12, eyeY);
    }
  }, [avatarData]);

  // Redraw canvas whenever avatar data changes
  useEffect(() => {
    drawAvatar();
  }, [avatarData, drawAvatar]);

  // Handle avatar data updates
  const updateAvatar = (key: keyof AvatarData, value: any) => {
    setAvatarData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Generate random avatar
  const randomizeAvatar = () => {
    const newAvatar: AvatarData = {
      body: Math.floor(Math.random() * 3),
      skinColor: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
      hair: Math.floor(Math.random() * 8),
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      eyes: Math.floor(Math.random() * 4),
      top: Math.floor(Math.random() * 6),
      topColor: CLOTH_COLORS[Math.floor(Math.random() * CLOTH_COLORS.length)],
      bottom: Math.floor(Math.random() * 4),
      bottomColor: CLOTH_COLORS[Math.floor(Math.random() * CLOTH_COLORS.length)],
      hat: Math.random() > 0.5 ? Math.floor(Math.random() * 4) : -1,
      hatColor: CLOTH_COLORS[Math.floor(Math.random() * CLOTH_COLORS.length)],
    };
    setAvatarData(newAvatar);
  };

  // Handle save
  const handleSave = () => {
    onSave(avatarData);
  };

  // Color selector component
  const ColorSelector: React.FC<{
    colors: string[];
    value: string;
    onChange: (color: string) => void;
  }> = ({ colors, value, onChange }) => (
    <div style={styles.colorGrid}>
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          style={{
            ...styles.colorCircle,
            backgroundColor: color,
            border: value === color ? '3px solid #FFD700' : '2px solid #555',
          }}
          title={color}
        />
      ))}
    </div>
  );

  // Option selector component
  const OptionSelector: React.FC<{
    count: number;
    value: number;
    onChange: (index: number) => void;
    allowNone?: boolean;
  }> = ({ count, value, onChange, allowNone = false }) => (
    <div style={styles.optionGrid}>
      {allowNone && (
        <button
          onClick={() => onChange(-1)}
          style={{
            ...styles.optionButton,
            backgroundColor: value === -1 ? '#E94560' : '#16213e',
            color: '#FFF',
          }}
        >
          None
        </button>
      )}
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{
            ...styles.optionButton,
            backgroundColor: value === i ? '#E94560' : '#16213e',
            color: '#FFF',
          }}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    modal: {
      backgroundColor: '#1a1a2e',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(233, 69, 96, 0.3)',
      maxWidth: '1000px',
      width: '90%',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column' as const,
      color: '#E0E0E0',
    },
    header: {
      padding: '20px',
      borderBottom: '2px solid #0f3460',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#FFD700',
    },
    content: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
      flexDirection: 'row' as const,
    },
    previewSection: {
      flex: '0 0 280px',
      padding: '20px',
      borderRight: '2px solid #0f3460',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#16213e',
    },
    canvas: {
      border: '2px solid #E94560',
      borderRadius: '8px',
      backgroundColor: '#0f3460',
    },
    panelSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    tabs: {
      display: 'flex',
      borderBottom: '2px solid #0f3460',
      backgroundColor: '#0f3460',
    },
    tab: (isActive: boolean) => ({
      flex: 1,
      padding: '12px',
      border: 'none',
      backgroundColor: isActive ? '#E94560' : 'transparent',
      color: isActive ? '#1a1a2e' : '#E0E0E0',
      cursor: 'pointer' as const,
      fontWeight: isActive ? 'bold' : 'normal' as const,
      fontSize: '14px',
      transition: 'background-color 0.2s',
    }),
    tabContent: {
      flex: 1,
      padding: '20px',
      overflowY: 'auto' as const,
    },
    section: {
      marginBottom: '20px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#FFD700',
      marginBottom: '12px',
      borderBottom: '1px solid #0f3460',
      paddingBottom: '8px',
    },
    colorGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
    },
    colorCircle: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      cursor: 'pointer',
      transition: 'transform 0.2s',
    },
    optionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
    },
    optionButton: {
      padding: '12px',
      border: '2px solid #555',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'all 0.2s',
    },
    footer: {
      padding: '20px',
      borderTop: '2px solid #0f3460',
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      backgroundColor: '#0f3460',
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    saveButton: {
      backgroundColor: '#E94560',
      color: '#FFF',
    },
    cancelButton: {
      backgroundColor: '#555',
      color: '#FFF',
    },
    randomButton: {
      backgroundColor: '#FFD700',
      color: '#1a1a2e',
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>Avatar Creator</div>

        <div style={styles.content}>
          {/* Left: Preview */}
          <div style={styles.previewSection}>
            <div style={{ marginBottom: '20px' }}>
              <canvas
                ref={canvasRef}
                width={200}
                height={300}
                style={styles.canvas}
              />
            </div>
            <button
              onClick={randomizeAvatar}
              style={{ ...styles.button, ...styles.randomButton, width: '100%' }}
            >
              Randomize
            </button>
          </div>

          {/* Right: Customization */}
          <div style={styles.panelSection}>
            <div style={styles.tabs}>
              {['body', 'hair', 'face', 'clothing', 'accessories'].map((tabName) => (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName as any)}
                  style={styles.tab(activeTab === tabName)}
                >
                  {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
                </button>
              ))}
            </div>

            <div style={styles.tabContent}>
              {/* Body Tab */}
              {activeTab === 'body' && (
                <div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Body Type</div>
                    <OptionSelector
                      count={3}
                      value={avatarData.body}
                      onChange={(val) => updateAvatar('body', val)}
                    />
                  </div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Skin Color</div>
                    <ColorSelector
                      colors={SKIN_COLORS}
                      value={avatarData.skinColor}
                      onChange={(color) => updateAvatar('skinColor', color)}
                    />
                  </div>
                </div>
              )}

              {/* Hair Tab */}
              {activeTab === 'hair' && (
                <div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Hair Style</div>
                    <OptionSelector
                      count={8}
                      value={avatarData.hair}
                      onChange={(val) => updateAvatar('hair', val)}
                    />
                  </div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Hair Color</div>
                    <ColorSelector
                      colors={HAIR_COLORS}
                      value={avatarData.hairColor}
                      onChange={(color) => updateAvatar('hairColor', color)}
                    />
                  </div>
                </div>
              )}

              {/* Face Tab */}
              {activeTab === 'face' && (
                <div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Eye Style</div>
                    <OptionSelector
                      count={4}
                      value={avatarData.eyes}
                      onChange={(val) => updateAvatar('eyes', val)}
                    />
                  </div>
                  <div style={{ color: '#999', fontSize: '14px', marginTop: '20px' }}>
                    <p>Eye styles:</p>
                    <ul>
                      <li>1: Classic round</li>
                      <li>2: Happy crescent</li>
                      <li>3: Angry slant</li>
                      <li>4: Star eyes</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Clothing Tab */}
              {activeTab === 'clothing' && (
                <div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Top Style</div>
                    <OptionSelector
                      count={6}
                      value={avatarData.top}
                      onChange={(val) => updateAvatar('top', val)}
                    />
                  </div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Top Color</div>
                    <ColorSelector
                      colors={CLOTH_COLORS}
                      value={avatarData.topColor}
                      onChange={(color) => updateAvatar('topColor', color)}
                    />
                  </div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Bottom Style</div>
                    <OptionSelector
                      count={4}
                      value={avatarData.bottom}
                      onChange={(val) => updateAvatar('bottom', val)}
                    />
                  </div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Bottom Color</div>
                    <ColorSelector
                      colors={CLOTH_COLORS}
                      value={avatarData.bottomColor}
                      onChange={(color) => updateAvatar('bottomColor', color)}
                    />
                  </div>
                </div>
              )}

              {/* Accessories Tab */}
              {activeTab === 'accessories' && (
                <div>
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Hat Style</div>
                    <OptionSelector
                      count={4}
                      value={avatarData.hat}
                      onChange={(val) => updateAvatar('hat', val)}
                      allowNone
                    />
                  </div>
                  {avatarData.hat >= 0 && (
                    <div style={styles.section}>
                      <div style={styles.sectionTitle}>Hat Color</div>
                      <ColorSelector
                        colors={CLOTH_COLORS}
                        value={avatarData.hatColor}
                        onChange={(color) => updateAvatar('hatColor', color)}
                      />
                    </div>
                  )}
                  <div style={{ color: '#999', fontSize: '14px', marginTop: '20px' }}>
                    <p>Hat styles:</p>
                    <ul>
                      <li>1: Top hat</li>
                      <li>2: Cowboy hat</li>
                      <li>3: Beanie</li>
                      <li>4: Crown</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{ ...styles.button, ...styles.cancelButton }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            style={{ ...styles.button, ...styles.saveButton }}
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarCreator;
