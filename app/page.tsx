import Link from "next/link";
import { Sparkles, Clock, Shield, Truck, Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import CountUp from "@/components/CountUp";
import CustomerChatbot from "@/components/CustomerChatbot";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">CleanLoop</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/services" className="text-gray-700 hover:text-emerald-600 font-medium transition-all duration-300 hover:scale-105">Services</Link>
            <Link href="/membership" className="text-gray-700 hover:text-emerald-600 font-medium transition-all duration-300 hover:scale-105">Pricing</Link>
            <Link href="/track" className="text-gray-700 hover:text-emerald-600 font-medium transition-all duration-300 hover:scale-105">Track Order</Link>
            <Link href="/login" className="text-gray-700 hover:text-emerald-600 font-medium transition-all duration-300 hover:scale-105">Login</Link>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-all duration-300 hover:scale-105">
              <Link href="/order">Book Now</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-50 via-white to-teal-50" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/50 to-white" />
        <div className="container relative mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in">
            <Star className="w-4 h-4 fill-emerald-600 animate-spin-slow" />
            Trusted by 10,000+ customers
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-slide-up">
            Professional Laundry
            <br />
            <span className="bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">At Your Doorstep</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed animate-slide-up animation-delay-200">
            Expert cleaning with free pickup & delivery. Experience premium laundry service that fits your lifestyle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-400">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 text-lg px-10 h-14">
              <Link href="/order">Schedule Pickup</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-gray-300 hover:border-emerald-600 hover:text-emerald-600 text-lg px-10 h-14">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 mt-20 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-fade-in animation-delay-600">
              <div className="text-4xl md:text-5xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"><CountUp end={10000} suffix="+" duration={2200} /></div>
              <div className="text-gray-600 mt-2 font-medium">Happy Customers</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-fade-in animation-delay-700">
              <div className="text-4xl md:text-5xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"><CountUp end={10} duration={1800} /></div>
              <div className="text-gray-600 mt-2 font-medium">Outlets</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-fade-in animation-delay-800">
              <div className="text-4xl md:text-5xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"><CountUp end={24} suffix="hr" duration={1500} /></div>
              <div className="text-gray-600 mt-2 font-medium">Express Service</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-fade-in animation-delay-900">
              <div className="text-4xl md:text-5xl font-bold bg-linear-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"><CountUp end={4.9} suffix="★" decimals={1} duration={1800} /></div>
              <div className="text-gray-600 mt-2 font-medium">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-24 bg-white">
        <div className="text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Why Choose CleanLoop?</h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Experience the difference with our professional service</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard 
            icon={<Truck className="w-12 h-12 text-emerald-600" />}
            title="Free Pickup & Delivery"
            description="We pick up and deliver your laundry at your convenience, completely free."
          />
          <FeatureCard 
            icon={<Clock className="w-12 h-12 text-emerald-600" />}
            title="Express Service"
            description="Need it urgently? Get your clothes back in 24 hours with our express service."
          />
          <FeatureCard 
            icon={<Shield className="w-12 h-12 text-emerald-600" />}
            title="Quality Guaranteed"
            description="Professional cleaning with eco-friendly products and 100% satisfaction guarantee."
          />
          <FeatureCard 
            icon={<Star className="w-12 h-12 text-emerald-600" />}
            title="Real-time Tracking"
            description="Track your order status in real-time from pickup to delivery."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Get started in just 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <ProcessStep 
              number="1"
              title="Schedule Pickup"
              description="Choose your preferred date and time slot for pickup through our app or website."
            />
            <ProcessStep 
              number="2"
              title="We Clean"
              description="Our experts clean your clothes with care using premium, eco-friendly products."
            />
            <ProcessStep 
              number="3"
              title="We Deliver"
              description="Get your fresh, clean clothes delivered right to your doorstep."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="relative overflow-hidden bg-linear-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-3xl p-12 md:p-16 text-white shadow-2xl">
          <div className="absolute inset-0 bg-linear-to-tr from-black/10 to-transparent" />
          <div className="relative">
            <h3 className="text-4xl md:text-5xl font-bold mb-4">Ready to Experience CleanLoop?</h3>
            <p className="text-xl md:text-2xl mb-10 text-emerald-50 max-w-2xl">
              Join thousands of satisfied customers. Get 20% off on your first order!
            </p>
            <Button asChild size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 shadow-xl text-lg px-10 h-14">
              <Link href="/order">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Customer Chatbot */}
      <CustomerChatbot />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-2xl hover:border-emerald-100 transition-all duration-500 animate-fade-in hover:-translate-y-2">
      <div className="absolute inset-0 bg-linear-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      <div className="relative">
        <div className="mb-5 transform group-hover:scale-110 transition-transform duration-500">{icon}</div>
        <h4 className="text-xl font-bold mb-3 text-gray-900">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ProcessStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center group animate-slide-up hover:scale-105 transition-transform duration-300">
      <div className="w-20 h-20 bg-linear-to-br from-emerald-600 to-teal-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg shadow-emerald-600/30 group-hover:shadow-2xl group-hover:shadow-emerald-600/40 transition-all duration-300">
        {number}
      </div>
      <h4 className="text-xl font-bold mb-3 text-gray-900">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
