"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, Loader2, Shirt, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

type ServiceCategory = { id: string; name: string; description: string | null };

type Service = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  basePrice: number;
  processingTimeHours: number;
  unit: string;
  isExpressAvailable: boolean;
  expressMultiplier: number;
  category: ServiceCategory;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by category
  const grouped = services.reduce<Record<string, { category: ServiceCategory; services: Service[] }>>((acc, s) => {
    if (!acc[s.category.id]) acc[s.category.id] = { category: s.category, services: [] };
    acc[s.category.id].services.push(s);
    return acc;
  }, {});
  const categoryGroups = Object.values(grouped);

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
      {/* Navbar */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 hover:scale-105">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 hover:scale-105">
              <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">CleanLoop</h1>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/track" className="text-gray-700 hover:text-emerald-600 font-medium transition-all duration-300">Track Order</Link>
            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-all duration-300">Sign In</Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-12 px-6">
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">Our Services</h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">Professional laundry solutions for all your needs</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20">
            <Shirt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No services available right now</p>
          </div>
        ) : (
          <>
            {categoryGroups.map(({ category, services: catServices }) => (
              <div key={category.id} className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{category.name}</h2>
                {category.description && <p className="text-gray-600 mb-6">{category.description}</p>}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catServices.map((service, index) => (
                    <div
                      key={service.id}
                      className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="w-14 h-14 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                        <Shirt className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{service.name}</h3>
                      {service.description && <p className="text-gray-600 text-sm mb-4">{service.description}</p>}
                      <div className="mb-5">
                        <div className="text-3xl font-bold text-gray-900">
                          ₹{Number(service.basePrice)}
                          <span className="text-base font-normal text-gray-600">/{service.unit}</span>
                        </div>
                      </div>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-center gap-2 text-sm text-gray-700">
                          <Clock className="w-4 h-4 text-emerald-600" />
                          Ready in {service.processingTimeHours} hours
                        </li>
                        {service.isExpressAvailable && (
                          <li className="flex items-center gap-2 text-sm text-amber-700">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Express available ({Number(service.expressMultiplier)}x price)
                          </li>
                        )}
                        <li className="flex items-center gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />Free pickup & delivery
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />Quality guaranteed
                        </li>
                      </ul>
                      <Button asChild className="w-full text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30">
                        <Link href={`/order?service=${service.id}`}>Book Now</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* CTA Section */}
        <div className="mt-8 text-center bg-white rounded-2xl p-12 shadow-xl border border-gray-200 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Experience Premium Laundry Service?</h2>
          <p className="text-gray-600 mb-8 text-lg">Book your first order today and get 20% off!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30">
              <Link href="/order">Schedule Pickup</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              <Link href="/membership">View Membership Plans</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
