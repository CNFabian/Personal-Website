import React, { useState, useEffect } from 'react';
import { FaGithub, FaLinkedin, FaInstagram, FaInfoCircle } from 'react-icons/fa';
import './new_home.css';

const newHome = () => {
  // State to control animation triggers
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(0);
  const [isCharacterRevealed, setIsCharacterRevealed] = useState(false);
  
  const characterVariations = [
  {
    id: 0,
    name: "Christopher",
    class: "Frontend Developer",
    image: require('../assets/casualman.png'),
    stats: {
      creativity: "+S",
      problemSolving: "A",
      codeQuality: "-A",
      teamWork: " A"
    },
    skills: ["React Mastery", "UI/UX Design", "Animation", "Figma Expert", "API Integration"]
  },
  {
    id: 1,
    name: "Chris",
    class: "The Hobbyist",
    image: require('../assets/seriousman.png'),
    stats: {
      drawing: "A",
      reading: "-A",
      cooking: "B",
      anime: "-A"
    },
    skills: ["TV Watching", "DIY Crafting", "Trying New Things", "Resourceful", "Good Vibes"]
  },
  {
    id: 2,
    name: "C. Fabian",
    class: "All Business",
    image: require('../assets/businessman.png'),
    stats: {
      leadership: "+B",
      communication: "-A",
      networking: "B",
      decisionMaking: "S"
    },
    skills: ["Crypto Investing", "Negotiation", "Personal Development", "Graphic Design", "Prototyping"]
  }
];

useEffect(() => {
  const timer = setTimeout(() => {
    setIsCharacterRevealed(true);
  }, 1000);
  return () => clearTimeout(timer);
}, []);

  // Trigger animations after component mount
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      <div className="home-container">
        <div className="content-wrapper">
          <div className={`left-section ${isLoaded ? 'animate-in' : ''}`}>
            <div className="name-container">
              <h1 className="title title-first">I'M</h1>
              <h1 className="title title-second">CHRISTOPHER</h1>
              <h1 className="title title-third">FABIAN <FaInfoCircle className="info-icon" /></h1>
            </div>
            
            <div className={`projects-section ${isLoaded ? 'animate-in' : ''}`}>
              <h2 className="section-title">RECENT PROJECTS</h2>
              <ul className="project-list">
                <li className="project-item">
                  <a href='/projects' className="project-link">Pantry Pall Full Stack Web App</a>
                </li>
                <li className="project-item">
                  <a href="/projects" className="project-link">CASA Website Redesign</a>
                </li>
                <li className="project-item">
                  <a href='/secret' className="project-link">Secret Page</a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className={`right-section ${isLoaded ? 'animate-in' : ''}`}>
            <div className="profile-photo-container">
              <img 
                src={require('../assets/profile-photo.png')} 
                alt="Christopher Fabian" 
                className={`profile-photo ${isLoaded ? 'animate-in' : ''}`} 
              />
            </div>
            
            <div className="circular-icons">
              <div className={`icon-circle1 ${isLoaded ? 'animate-in' : ''}`}>
                <img src={require('../assets/Group-4.png')}/>
                <div className="icon-description">I love to express my creativity in my drawings, or more recently in Web Design</div>
              </div>
              
              <div className={`icon-circle2 ${isLoaded ? 'animate-in' : ''}`}>
                <img src={require('../assets/Group-3.png')}/>
                <div className="icon-description">Strong programming skills with high project expereince in Python, C++, and Javascript.</div>
              </div>
              
              <div className={`icon-circle3 ${isLoaded ? 'animate-in' : ''}`}>
                <img src={require('../assets/Group-1.png')}/>
                <div className="icon-description">Have skills in Data Analysis, hoping to find a career path in it</div>
              </div>
              
              <div className={`icon-circle4 ${isLoaded ? 'animate-in' : ''}`}>
                <img src={require('../assets/Group-2.png')}/>
                <div className="icon-description">Enjoy reading a good book, current favorite author is Stephen King</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`tech-icons ${isLoaded ? 'animate-in' : ''}`}>
          <div className="tech-icon react">
            <svg viewBox="0 0 24 24">
              <path d="M12 9.861A2.139 2.139 0 1 0 12 14.139 2.139 2.139 0 1 0 12 9.861zM6.008 16.255l-.472-.12C2.018 15.246 0 13.737 0 11.996s2.018-3.25 5.536-4.139l.472-.119.133.468a23.53 23.53 0 0 0 1.363 3.578l.101.213-.101.213a23.307 23.307 0 0 0-1.363 3.578l-.133.467zM5.317 8.95c-2.674.751-4.315 1.9-4.315 3.046 0 1.145 1.641 2.294 4.315 3.046a24.95 24.95 0 0 1 1.182-3.046A24.752 24.752 0 0 1 5.317 8.95zM17.992 16.255l-.133-.469a23.357 23.357 0 0 0-1.364-3.577l-.101-.213.101-.213a23.42 23.42 0 0 0 1.364-3.578l.133-.468.473.119c3.517.889 5.535 2.398 5.535 4.14s-2.018 3.25-5.535 4.139l-.473.12zm-.491-4.259c.48 1.039.877 2.06 1.182 3.046 2.675-.752 4.315-1.901 4.315-3.046 0-1.146-1.641-2.294-4.315-3.046a24.788 24.788 0 0 1-1.182 3.046zM5.31 8.945l-.133-.467C4.188 4.992 4.488 2.494 6 1.622c1.483-.856 3.864.155 6.359 2.716l.34.349-.34.349a23.552 23.552 0 0 0-2.422 2.967l-.135.193-.235.02a23.657 23.657 0 0 0-3.785.61l-.472.119zm1.896-6.63c-.268 0-.505.058-.705.173-.994.573-1.17 2.565-.485 5.253a25.122 25.122 0 0 1 3.233-.501 24.847 24.847 0 0 1 2.052-2.544c-1.56-1.519-3.037-2.381-4.095-2.381zM16.795 22.677c-.001 0-.001 0 0 0-1.425 0-3.255-1.073-5.154-3.023l-.34-.349.34-.349a23.53 23.53 0 0 0 2.421-2.968l.135-.193.234-.02a23.63 23.63 0 0 0 3.787-.609l.472-.119.134.468c.987 3.484.688 5.983-.824 6.854a2.38 2.38 0 0 1-1.205.308zm-4.096-3.381c1.56 1.519 3.037 2.381 4.095 2.381h.001c.267 0 .505-.058.704-.173.994-.573 1.171-2.566.485-5.254a25.02 25.02 0 0 1-3.234.501 24.674 24.674 0 0 1-2.051 2.545zM18.69 8.945l-.472-.119a23.479 23.479 0 0 0-3.787-.61l-.234-.02-.135-.193a23.414 23.414 0 0 0-2.421-2.967l-.34-.349.34-.349C14.135 1.778 16.515.767 18 1.622c1.512.872 1.812 3.37.824 6.855l-.134.468zM14.75 7.24c1.142.104 2.227.273 3.234.501.686-2.688.509-4.68-.485-5.253-.988-.571-2.845.304-4.8 2.208A24.849 24.849 0 0 1 14.75 7.24zM7.206 22.677A2.38 2.38 0 0 1 6 22.369c-1.512-.871-1.812-3.369-.823-6.854l.132-.468.472.119c1.155.291 2.429.496 3.785.609l.235.02.134.193a23.596 23.596 0 0 0 2.422 2.968l.34.349-.34.349c-1.898 1.95-3.728 3.023-5.151 3.023zm-1.19-6.427c-.686 2.688-.509 4.681.485 5.254.987.563 2.843-.305 4.8-2.208a24.998 24.998 0 0 1-2.052-2.545 24.976 24.976 0 0 1-3.233-.501zM12 16.878c-.823 0-1.669-.036-2.516-.106l-.235-.02-.135-.193a30.388 30.388 0 0 1-1.35-2.122 30.354 30.354 0 0 1-1.166-2.228l-.1-.213.1-.213a30.3 30.3 0 0 1 1.166-2.228c.414-.716.869-1.43 1.35-2.122l.135-.193.235-.02a29.785 29.785 0 0 1 5.033 0l.234.02.134.193a30.006 30.006 0 0 1 2.517 4.35l.101.213-.101.213a29.6 29.6 0 0 1-2.517 4.35l-.134.193-.234.02c-.847.07-1.694.106-2.517.106zm-2.197-1.084c1.48.111 2.914.111 4.395 0a29.006 29.006 0 0 0 2.196-3.798 28.585 28.585 0 0 0-2.197-3.798 29.031 29.031 0 0 0-4.394 0 28.477 28.477 0 0 0-2.197 3.798 29.114 29.114 0 0 0 2.197 3.798z"/>
            </svg>
          </div>
          
          <div className="tech-icon python">
            <svg viewBox="0 0 24 24">
              <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
            </svg>
          </div>
          
          <div className="tech-icon js">
            <svg viewBox="0 0 24 24">
              <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>
            </svg>
          </div>
          
          <div className="tech-icon cpp">
            <svg viewBox="0 0 24 24">
              <path d="M10.5 15.97l.41 2.44c-.26.14-.68.27-1.24.39-.57.13-1.24.2-2.01.2-2.21-.04-3.87-.7-4.98-1.96C1.56 15.77 1 14.16 1 12.21c.05-2.31.72-4.08 2-5.32C4.32 5.64 5.96 5 7.94 5c.75 0 1.4.07 1.94.19s.94.25 1.2.4l-.58 2.49-1.06-.34c-.4-.1-.86-.15-1.39-.15-1.16-.01-2.12.36-2.87 1.1-.76.73-1.15 1.85-1.18 3.34 0 1.36.37 2.42 1.08 3.2.71.77 1.71 1.17 2.99 1.18l1.33-.12c.43-.08.79-.19 1.1-.32M16.5 15.75h-2v2h-2v-2h-2v-2h2v-2h2v2h2v2zm5 0h-2v2h-2v-2h-2v-2h2v-2h2v2h2v2z"/>
            </svg>
          </div>
          
          <div className="tech-icon html">
            <svg viewBox="0 0 24 24">
              <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>
            </svg>
          </div>
          
          <div className="tech-icon css">
            <svg viewBox="0 0 24 24">
              <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414v-.001z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Character Select Section */}
      <div className={`character-select-section ${isLoaded ? 'animate-in' : ''}`}>
        <div className="character-select-header">
          <h2 className="character-select-title">Select Your Developer</h2>
          <p className="character-select-subtitle">Choose your programming companion</p>
        </div>
        
        <div className="character-display-area">
          <div className="character-info-left">
            <div className="character-stats-side">
              <div className="stats-title">Stats</div>
              <div className="stat-item-side">
                <div className="stat-label-side">Creativity</div>
                <div className="stat-value-side">{characterVariations[selectedCharacter].stats.creativity}</div>
              </div>
              <div className="stat-item-side">
                <div className="stat-label-side">Problem Solving</div>
                <div className="stat-value-side">{characterVariations[selectedCharacter].stats.problemSolving}</div>
              </div>
              <div className="stat-item-side">
                <div className="stat-label-side">Code Quality</div>
                <div className="stat-value-side">{characterVariations[selectedCharacter].stats.codeQuality}</div>
              </div>
              <div className="stat-item-side">
                <div className="stat-label-side">Team Work</div>
                <div className="stat-value-side">{characterVariations[selectedCharacter].stats.teamWork}

                </div>
              </div>
            </div>
          </div>

          <div className="character-center">
            <h3 className="character-name-display">{characterVariations[selectedCharacter].name}</h3>
            <p className="character-class-display">{characterVariations[selectedCharacter].class}</p>
            <img 
              src={characterVariations[selectedCharacter].image}
              alt={characterVariations[selectedCharacter].name}
              className={`character-main-image ${isCharacterRevealed ? 'revealed' : ''}`}
            />
          </div>

          <div className="character-info-right">
            <div className="character-skills-side">
              <div className="skills-title-side">Special Abilities</div>
              <div className="skills-list-side">
                {characterVariations[selectedCharacter].skills.map((skill, index) => (
                  <span key={index} className="skill-badge-side">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="character-variations">
          {characterVariations.map((character, index) => (
            <img
              key={character.id}
              src={character.image}
              alt={character.name}
              className={`variation-option ${selectedCharacter === index ? 'selected' : ''}`}
              onClick={() => setSelectedCharacter(index)}
            />
          ))}
        </div>

        <button className="recruit-button" onClick={() => window.location.href = '/contact'}>
          Recruit Developer
        </button>

        <button className="resume-button" onClick={() => window.location.href = '/resume'}>
          Download Resume
        </button>
      </div>
    </>
  );
};

export default newHome;