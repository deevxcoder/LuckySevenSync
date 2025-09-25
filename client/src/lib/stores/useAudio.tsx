import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  isMuted: boolean;
  isInitialized: boolean;
  
  // Initialize all sounds
  initializeSounds: () => void;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playCountdownTick: () => void;
  playHeartbeat: () => void;
  playCardReveal: () => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  isMuted: true, // Start muted by default
  isInitialized: false,
  
  initializeSounds: () => {
    try {
      const backgroundMusic = new Audio('/sounds/background.mp3');
      const hitSound = new Audio('/sounds/hit.mp3');
      const successSound = new Audio('/sounds/success.mp3');
      
      // Configure background music
      backgroundMusic.loop = true;
      backgroundMusic.volume = 0.3;
      
      // Configure sound effects
      hitSound.volume = 0.5;
      successSound.volume = 0.6;
      
      set({ 
        backgroundMusic, 
        hitSound, 
        successSound,
        isInitialized: true 
      });
      
      console.log('🔊 Audio system initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  },
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  
  toggleMute: () => {
    const { isMuted, backgroundMusic } = get();
    const newMutedState = !isMuted;
    
    // Control background music playback
    if (backgroundMusic) {
      if (newMutedState) {
        // Muting - pause background music
        backgroundMusic.pause();
      } else {
        // Unmuting - start background music (user gesture satisfies autoplay)
        backgroundMusic.volume = 0.2;
        backgroundMusic.play().catch(error => {
          console.log('Background music play prevented:', error);
        });
      }
    }
    
    // Update the muted state
    set({ isMuted: newMutedState });
    
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Hit sound skipped (muted)");
        return;
      }
      
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound && !isMuted) {
      successSound.currentTime = 0;
      successSound.volume = 0.6;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  },
  
  playCountdownTick: () => {
    const { hitSound, isMuted } = get();
    if (hitSound && !isMuted) {
      const tickClone = hitSound.cloneNode() as HTMLAudioElement;
      tickClone.volume = 0.4;
      tickClone.playbackRate = 1.2; // Make it sound more like a tick
      tickClone.play().catch(error => {
        console.log("Countdown tick play prevented:", error);
      });
    }
  },
  
  playHeartbeat: () => {
    const { hitSound, isMuted } = get();
    if (hitSound && !isMuted) {
      // Create a dramatic heartbeat effect using the hit sound
      const heartbeatClone = hitSound.cloneNode() as HTMLAudioElement;
      heartbeatClone.volume = 0.7; // Louder for drama
      heartbeatClone.playbackRate = 0.8; // Slower and deeper for heartbeat effect
      heartbeatClone.play().catch(error => {
        console.log("Heartbeat sound play prevented:", error);
      });
      
      // Add a second beat after a short delay to simulate heartbeat
      setTimeout(() => {
        if (!get().isMuted) {
          const secondBeat = hitSound.cloneNode() as HTMLAudioElement;
          secondBeat.volume = 0.5; // Slightly quieter second beat
          secondBeat.playbackRate = 0.9;
          secondBeat.play().catch(error => {
            console.log("Second heartbeat sound play prevented:", error);
          });
        }
      }, 150); // Short delay for second beat
    }
  },
  
  playCardReveal: () => {
    const { successSound, isMuted } = get();
    if (successSound && !isMuted) {
      const revealClone = successSound.cloneNode() as HTMLAudioElement;
      revealClone.volume = 0.7;
      revealClone.playbackRate = 0.9; // Slightly slower for drama
      revealClone.play().catch(error => {
        console.log("Card reveal sound play prevented:", error);
      });
    }
  },
  
  playBackgroundMusic: () => {
    const { backgroundMusic, isMuted } = get();
    if (backgroundMusic && !isMuted) {
      backgroundMusic.volume = 0.2;
      backgroundMusic.currentTime = 0; // Restart from beginning
      backgroundMusic.play().catch(error => {
        console.log("Background music play prevented:", error);
      });
    }
  },
  
  stopBackgroundMusic: () => {
    const { backgroundMusic } = get();
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
  }
}));
