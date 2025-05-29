import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { InstallBanner } from "@/components/install-banner"
import { Sparkles, Plane, Camera, Map, Heart, Laugh, Compass, Utensils, Tent, Palmtree } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <InstallBanner />
      <header className="py-6 px-4 sm:px-6 lg:px-8 border-b backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center text-white font-bold text-lg animate-pulse">
              V
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-pink">
              VDH Vault
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost" className="hover:bg-vault-purple/10">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/join">
              <Button variant="ghost" className="text-vault-purple hover:bg-vault-purple/10 font-medium">
                Join Trip
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-vault-pink opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-vault-purple opacity-10 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto text-center relative z-1">
            <div className="inline-block mb-4 animate-bounce-slow">
              <div className="bg-vault-purple/10 p-3 rounded-full">
                <Sparkles className="w-8 h-8 text-vault-purple" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 animate-fade-in relative">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-pink">
                Family Vacations,
              </span>
              <br />
              <span className="relative">
                Beautifully Preserved
                <span className="absolute -top-1 -right-1 text-xs bg-vault-orange text-white px-2 py-1 rounded-full transform rotate-12 animate-pulse">
                  No awkward photos!
                </span>
              </span>
            </h1>

            <p className="text-xl max-w-2xl mx-auto mb-8 text-gray-600 dark:text-gray-300 animate-slide-up">
              Plan together, capture memories, and relive your favorite family moments in one private, beautiful space.
              <span className="block mt-2 italic text-vault-purple">
                Because someone needs to remember where Dad put the car keys.
              </span>
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <Link href="/auth/signin">
                <Button
                  size="lg"
                  className="bg-vault-purple hover:bg-vault-purple/90 text-white w-full sm:w-auto group"
                >
                  Create a Trip
                  <Plane className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/join">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto group border-vault-purple text-vault-purple hover:bg-vault-purple/10 font-medium"
                >
                  Join with Invite Code
                  <Heart className="ml-2 w-4 h-4 group-hover:scale-125 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="relative mx-auto w-full max-w-3xl h-64 sm:h-80 mb-12 rounded-xl overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-vault-purple/20 to-vault-pink/20 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md text-center transform -rotate-2 hover:rotate-0 transition-transform">
                  <h3 className="text-xl font-bold mb-2">Family Trip to Maui</h3>
                  <p className="text-sm text-gray-500 mb-4">June 15-22, 2025 • 4 family members</p>
                  <div className="flex justify-center gap-4 mb-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-vault-purple/20 flex items-center justify-center mb-1">
                        <Camera className="w-5 h-5 text-vault-purple" />
                      </div>
                      <span className="text-xs">42 Photos</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-vault-pink/20 flex items-center justify-center mb-1">
                        <Map className="w-5 h-5 text-vault-pink" />
                      </div>
                      <span className="text-xs">8 Places</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-vault-orange/20 flex items-center justify-center mb-1">
                        <Laugh className="w-5 h-5 text-vault-orange" />
                      </div>
                      <span className="text-xs">16 Memories</span>
                    </div>
                  </div>
                  <div className="text-xs italic text-gray-500">"Dad only got sunburned twice!"</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {[
                "No more 'Are we there yet?'",
                "Remember where you parked!",
                "Find that restaurant everyone loved",
                "Never lose the hotel address again",
              ].map((tag, i) => (
                <span
                  key={i}
                  className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full text-sm shadow-md border border-gray-100 dark:border-gray-700 animate-fade-in"
                  style={{ animationDelay: `${0.1 * i}s` }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              Because planning a family vacation shouldn't require a vacation from planning.
              <span className="block mt-2 italic text-vault-purple">Or a family therapist.</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: "Plan Together",
                  description:
                    "Create trips, invite family, and build your wishlist together. No more 'I thought YOU were booking the hotel!'",
                  color: "bg-vault-purple",
                  icon: Compass,
                  delay: 0,
                },
                {
                  title: "Discover Fun",
                  description:
                    "Find local events and activities. Because there's only so many times you can visit Aunt Edna's favorite museum.",
                  color: "bg-vault-pink",
                  icon: Map,
                  delay: 0.1,
                },
                {
                  title: "Capture Moments",
                  description:
                    "Journal memories and photos as they happen. Even the ones where Dad falls asleep with ice cream on his face.",
                  color: "bg-vault-orange",
                  icon: Camera,
                  delay: 0.2,
                },
                {
                  title: "Relive Adventures",
                  description:
                    "Revisit your trips through beautiful timelines. Remember the good times, forget the 3-hour airport delay.",
                  color: "bg-vault-teal",
                  icon: Heart,
                  delay: 0.3,
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${feature.delay}s` }}
                >
                  <div
                    className={`w-12 h-12 ${feature.color} rounded-full flex items-center justify-center text-white mb-4`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-vault-orange opacity-5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-vault-teal opacity-5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto text-center relative z-1">
            <h2 className="text-3xl font-bold mb-6">Family Vacation Stats</h2>
            <p className="text-xl max-w-2xl mx-auto mb-12 text-gray-600 dark:text-gray-300">
              Based on our completely made-up but totally believable research:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {[
                {
                  stat: "73%",
                  description: "of families can't find their hotel confirmation email when they need it",
                  icon: Tent,
                  color: "text-vault-purple",
                },
                {
                  stat: "42",
                  description: "average minutes spent arguing about where to eat dinner",
                  icon: Utensils,
                  color: "text-vault-pink",
                },
                {
                  stat: "8.5",
                  description: "times someone asks 'Are we there yet?' during a road trip",
                  icon: Compass,
                  color: "text-vault-orange",
                },
                {
                  stat: "100%",
                  description: "chance Dad will say 'We're making good time' at least once",
                  icon: Palmtree,
                  color: "text-vault-teal",
                },
              ].map((item, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
                  <div className={`text-4xl font-bold mb-2 ${item.color}`}>{item.stat}</div>
                  <div className="flex justify-center mb-4">
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
              <div className="italic text-lg mb-4">
                "Before VDH Vault, our family vacations were like herding cats... if the cats had strong opinions about
                which restaurants to visit."
              </div>
              <div className="font-semibold">— A Very Real Customer</div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-vault-purple text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto text-center relative z-1">
            <h2 className="text-3xl font-bold mb-6 animate-fade-in">Ready to start planning?</h2>
            <p className="text-xl max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Create your first trip and invite the whole family.
              <span className="block mt-2 italic">Even Uncle Bob who always packs too many Hawaiian shirts.</span>
            </p>
            <Link href="/auth/signin">
              <Button size="lg" className="bg-white text-vault-purple hover:bg-gray-100 animate-bounce-slow">
                Get Started
                <Sparkles className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t bg-white dark:bg-gray-900">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center text-white font-bold text-sm">
                V
              </div>
              <span className="text-lg font-bold">VDH Vault</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              <Link href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-vault-purple">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-vault-purple">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-vault-purple">
                Contact Us
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} VDH Vault. All rights reserved.
            <div className="text-sm mt-2 italic">
              Making family vacations memorable for the right reasons since 2025.
            </div>
          </div>
        </div>
      </footer>

      <PWAInstallPrompt />
    </div>
  )
}
