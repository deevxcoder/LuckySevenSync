import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Crown, Sparkles, Lock, Rocket, Target, Clock, Spade, Users, CheckCircle, Coins, Zap, Shield, BarChart, Globe, Gamepad2, Music, Trophy } from 'lucide-react';

interface HomePageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export default function HomePage({ onLoginClick, onSignupClick }: HomePageProps) {
  return (
    <div className="min-h-screen bg-neo-bg">
      {/* Hero Section */}
      <div className="relative py-20 px-4" style={{ 
        background: 'radial-gradient(circle at 50% 0%, rgba(0, 255, 198, 0.1) 0%, transparent 50%)',
      }}>
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl font-heading font-extrabold text-neo-accent mb-4 flex items-center justify-center gap-4">
            <Crown className="w-16 h-16" />
            FunRep
          </h1>
          <p className="text-2xl text-neo-text mb-8 font-heading">
            The Premier Gaming Platform for Synchronized Card Games
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onSignupClick}
              className="bg-neo-accent hover:bg-gradient-hover text-neo-bg font-heading font-semibold py-6 px-10 text-lg rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-neo-accent/50 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Join the Action
            </Button>
            <Button 
              onClick={onLoginClick}
              variant="outline"
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading font-semibold py-6 px-10 text-lg rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Lock className="w-5 h-5" />
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Game Section */}
      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-heading font-bold text-neo-accent text-center mb-12 flex items-center justify-center gap-3">
            <Target className="w-10 h-10" />
            Featured Game: Lucky 7
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Game Description */}
            <div className="neo-glass-card p-8">
              <div className="mb-6">
                <h3 className="text-3xl font-heading font-bold text-neo-accent mb-2 flex items-center gap-3">
                  <Sparkles className="w-8 h-8" />
                  Lucky 7
                </h3>
                <p className="text-neo-text text-lg">
                  The Ultimate Synchronized Card Experience
                </p>
              </div>
              <div className="space-y-4">
                <p className="text-neo-text-secondary">
                  Experience the thrill of synchronized gaming where every player sees the same card reveal at exactly the same moment. 
                  Will luck be on your side?
                </p>
                
                <div className="space-y-3 text-neo-text">
                  <div className="flex items-center gap-3">
                    <Clock className="text-neo-accent w-5 h-5" />
                    <span>Real-time synchronized gameplay</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Spade className="text-neo-accent w-5 h-5" />
                    <span>Cards numbered 1-13 in red and black</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="text-neo-accent w-5 h-5" />
                    <span>Play with up to 10 players simultaneously</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-neo-accent w-5 h-5" />
                    <span>Everyone sees identical results - no cheating!</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Coins className="text-neo-accent w-5 h-5" />
                    <span>Virtual chips betting system</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="space-y-4">
              <div className="neo-glass-card p-6 text-center">
                <div className="text-4xl font-mono font-semibold text-neo-accent mb-2">1,000+</div>
                <div className="text-neo-text-secondary">Active Players</div>
                <div className="live-indicator mt-3"></div>
              </div>
              <div className="neo-glass-card p-6 text-center">
                <div className="text-4xl font-mono font-semibold text-neo-accent mb-2">24/7</div>
                <div className="text-neo-text-secondary">Games Running</div>
              </div>
              <div className="neo-glass-card p-6 text-center">
                <div className="text-4xl font-mono font-semibold text-neo-accent mb-2">99.9%</div>
                <div className="text-neo-text-secondary">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Features */}
      <div className="py-20 px-4" style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(0, 255, 198, 0.05) 50%, transparent 100%)',
      }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-heading font-bold text-neo-accent text-center mb-12 flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10" />
            Platform Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="neo-glass-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <Zap className="w-12 h-12 text-neo-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-neo-accent mb-3">Lightning Fast</h3>
              <p className="text-neo-text-secondary">
                Real-time gameplay with sub-second synchronization across all players worldwide.
              </p>
            </div>

            <div className="neo-glass-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <Shield className="w-12 h-12 text-neo-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-neo-accent mb-3">Secure & Fair</h3>
              <p className="text-neo-text-secondary">
                Advanced security measures and transparent gameplay ensure everyone gets a fair shot.
              </p>
            </div>

            <div className="neo-glass-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <BarChart className="w-12 h-12 text-neo-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-neo-accent mb-3">Track Progress</h3>
              <p className="text-neo-text-secondary">
                Comprehensive dashboard with game history, statistics, and performance analytics.
              </p>
            </div>

            <div className="neo-glass-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <Globe className="w-12 h-12 text-neo-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-neo-accent mb-3">Global Community</h3>
              <p className="text-neo-text-secondary">
                Connect with players from around the world in our thriving gaming community.
              </p>
            </div>

            <div className="neo-glass-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <Gamepad2 className="w-12 h-12 text-neo-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-neo-accent mb-3">Easy to Play</h3>
              <p className="text-neo-text-secondary">
                Simple, intuitive interface that gets you into the action within seconds.
              </p>
            </div>

            <div className="neo-glass-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <Music className="w-12 h-12 text-neo-accent" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-neo-accent mb-3">Immersive Audio</h3>
              <p className="text-neo-text-secondary">
                Rich sound effects and background music enhance your gaming experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* About FunRep */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-heading font-bold text-neo-accent mb-8 flex items-center justify-center gap-3">
            <Crown className="w-10 h-10" />
            About FunRep
          </h2>
          
          <div className="neo-glass-card p-10">
            <p className="text-neo-text text-lg mb-6 leading-relaxed">
              Founded with a passion for creating unforgettable gaming experiences, FunRep has become 
              the premier destination for synchronized multiplayer card games. Our innovative platform 
              combines cutting-edge technology with classic game mechanics to deliver experiences that 
              are both familiar and revolutionary.
            </p>
            
            <p className="text-neo-text text-lg mb-8 leading-relaxed">
              At FunRep, we believe that the best games are those shared with others. That's why we've 
              built our platform from the ground up to ensure perfect synchronization, fair play, and 
              maximum excitement for every single player.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-neo-accent mb-2">2024</div>
                <div className="text-neo-text-secondary">Founded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-neo-accent mb-2">50+</div>
                <div className="text-neo-text-secondary">Countries Served</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-neo-accent mb-2">24/7</div>
                <div className="text-neo-text-secondary">Player Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-20 px-4" style={{
        background: 'radial-gradient(circle at 50% 100%, rgba(0, 255, 198, 0.1) 0%, transparent 50%)',
      }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-heading font-bold text-neo-accent mb-4">
            Ready to Experience Lucky 7?
          </h2>
          <p className="text-xl text-neo-text mb-8">
            Join thousands of players in the most exciting synchronized card game ever created.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onSignupClick}
              className="bg-neo-accent hover:bg-gradient-hover text-neo-bg font-heading font-semibold py-6 px-10 text-lg rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-neo-accent/50 flex items-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              Start Playing Now
            </Button>
            <Button 
              onClick={onLoginClick}
              variant="outline"
              className="border-2 border-neo-accent text-neo-accent hover:bg-neo-accent hover:text-neo-bg font-heading font-semibold py-6 px-10 text-lg rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Already a Member?
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 px-4 border-t border-neo-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-neo-accent text-lg font-heading font-bold mb-2 flex items-center justify-center gap-2">
            <Crown className="w-6 h-6" />
            FunRep - Where Every Game is Royal
          </p>
          <p className="text-neo-text-secondary text-sm">
            © 2024 FunRep. All rights reserved. Play responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
