import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface HomePageProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export default function HomePage({ onLoginClick, onSignupClick }: HomePageProps) {
  return (
    <div className="min-h-screen bg-casino-green">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-casino-black/90 to-casino-green/90 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold text-casino-gold mb-4">
            👑 King Games
          </h1>
          <p className="text-2xl text-white mb-8">
            The Premier Gaming Platform for Synchronized Card Games
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onSignupClick}
              className="bg-casino-red hover:bg-red-700 text-white font-bold py-4 px-8 text-lg glow-red"
            >
              🎰 Join the Action
            </Button>
            <Button 
              onClick={onLoginClick}
              variant="outline"
              className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black font-bold py-4 px-8 text-lg"
            >
              🔐 Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Game Section */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-casino-gold text-center mb-12">
            🎯 Featured Game: Lucky 7
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Game Description */}
            <Card className="bg-casino-black border-casino-gold border-2">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-casino-gold">
                  🎰 Lucky 7 🎰
                </CardTitle>
                <p className="text-white text-lg">
                  The Ultimate Synchronized Card Experience
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white">
                  Experience the thrill of synchronized gaming where every player sees the same card reveal at exactly the same moment. 
                  Will luck be on your side?
                </p>
                
                <div className="space-y-2 text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-casino-gold">🕐</span>
                    <span>Real-time synchronized gameplay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-casino-gold">🃏</span>
                    <span>Cards numbered 1-13 in red and black</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-casino-gold">👥</span>
                    <span>Play with up to 10 players simultaneously</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-casino-gold">🎯</span>
                    <span>Everyone sees identical results - no cheating!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-casino-gold">💰</span>
                    <span>Virtual chips betting system</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Stats */}
            <div className="space-y-4">
              <Card className="bg-casino-black border-casino-gold border-2">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-casino-gold">1,000+</div>
                  <div className="text-white">Active Players</div>
                </CardContent>
              </Card>
              <Card className="bg-casino-black border-casino-gold border-2">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-casino-gold">24/7</div>
                  <div className="text-white">Games Running</div>
                </CardContent>
              </Card>
              <Card className="bg-casino-black border-casino-gold border-2">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-casino-gold">99.9%</div>
                  <div className="text-white">Uptime</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Features */}
      <div className="py-16 px-4 bg-casino-black/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-casino-gold text-center mb-12">
            🏆 Platform Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-casino-black border-casino-gold border-2">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">⚡</div>
                <CardTitle className="text-casino-gold">Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-center">
                  Real-time gameplay with sub-second synchronization across all players worldwide.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-casino-black border-casino-gold border-2">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">🔒</div>
                <CardTitle className="text-casino-gold">Secure & Fair</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-center">
                  Advanced security measures and transparent gameplay ensure everyone gets a fair shot.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-casino-black border-casino-gold border-2">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <CardTitle className="text-casino-gold">Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-center">
                  Comprehensive dashboard with game history, statistics, and performance analytics.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-casino-black border-casino-gold border-2">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">🌍</div>
                <CardTitle className="text-casino-gold">Global Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-center">
                  Connect with players from around the world in our thriving gaming community.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-casino-black border-casino-gold border-2">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">🎮</div>
                <CardTitle className="text-casino-gold">Easy to Play</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-center">
                  Simple, intuitive interface that gets you into the action within seconds.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-casino-black border-casino-gold border-2">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">🎵</div>
                <CardTitle className="text-casino-gold">Immersive Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white text-center">
                  Rich sound effects and background music enhance your gaming experience.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* About King Games */}
      <div className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-casino-gold mb-8">
            👑 About King Games
          </h2>
          
          <Card className="bg-casino-black border-casino-gold border-2">
            <CardContent className="p-8">
              <p className="text-white text-lg mb-6 leading-relaxed">
                Founded with a passion for creating unforgettable gaming experiences, King Games has become 
                the premier destination for synchronized multiplayer card games. Our innovative platform 
                combines cutting-edge technology with classic game mechanics to deliver experiences that 
                are both familiar and revolutionary.
              </p>
              
              <p className="text-white text-lg mb-6 leading-relaxed">
                At King Games, we believe that the best games are those shared with others. That's why we've 
                built our platform from the ground up to ensure perfect synchronization, fair play, and 
                maximum excitement for every single player.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-casino-gold mb-2">2024</div>
                  <div className="text-white">Founded</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-casino-gold mb-2">50+</div>
                  <div className="text-white">Countries Served</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-casino-gold mb-2">24/7</div>
                  <div className="text-white">Player Support</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-16 px-4 bg-gradient-to-t from-casino-black/90 to-casino-green/90">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-casino-gold mb-4">
            Ready to Experience Lucky 7?
          </h2>
          <p className="text-xl text-white mb-8">
            Join thousands of players in the most exciting synchronized card game ever created.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onSignupClick}
              className="bg-casino-red hover:bg-red-700 text-white font-bold py-4 px-8 text-lg glow-red"
            >
              🚀 Start Playing Now
            </Button>
            <Button 
              onClick={onLoginClick}
              variant="outline"
              className="border-casino-gold text-casino-gold hover:bg-casino-gold hover:text-casino-black font-bold py-4 px-8 text-lg"
            >
              👑 Already a Member?
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-casino-black py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-casino-gold text-lg font-bold mb-2">
            👑 King Games - Where Every Game is Royal
          </p>
          <p className="text-white text-sm">
            © 2024 King Games. All rights reserved. Play responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}