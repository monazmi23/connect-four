import React, { useEffect } from 'react';

const Fireworks = () => {
  useEffect(() => {
    const createFirework = () => {
      const firework = document.createElement('div');
      firework.className = 'firework';
      
      // Random position on the screen
      firework.style.left = Math.random() * 100 + 'vw';
      firework.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
      
      document.querySelector('.fireworks-container').appendChild(firework);
      
      // Remove the firework after animation
      setTimeout(() => {
        firework.remove();
      }, 2000);
    };

    // Create multiple fireworks
    const interval = setInterval(() => {
      for (let i = 0; i < 3; i++) {
        createFirework();
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return <div className="fireworks-container" />;
};

export default Fireworks;