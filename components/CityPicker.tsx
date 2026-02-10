"use client";

import { useState, useEffect } from "react";
import { MapPin, X } from "lucide-react";

const CITIES = [
  {
    name: "Mumbai",
    monument: "Gateway of India",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Gateway of India */}
        <rect x="15" y="50" width="50" height="6" rx="1" fill="#1e293b"/>
        <rect x="20" y="30" width="40" height="20" rx="2" fill="#334155"/>
        <rect x="25" y="35" width="8" height="15" rx="4" fill="#e2e8f0"/>
        <rect x="36" y="35" width="8" height="15" rx="4" fill="#e2e8f0"/>
        <rect x="47" y="35" width="8" height="15" rx="4" fill="#e2e8f0"/>
        <path d="M25 30 Q40 12 55 30" fill="#334155" stroke="#1e293b" strokeWidth="1"/>
        <rect x="37" y="18" width="6" height="12" rx="3" fill="#e2e8f0"/>
        <circle cx="40" cy="15" r="3" fill="#f59e0b"/>
      </svg>
    ),
  },
  {
    name: "Pune",
    monument: "Shaniwar Wada",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Shaniwar Wada fort gate */}
        <rect x="15" y="50" width="50" height="6" rx="1" fill="#1e293b"/>
        <rect x="18" y="25" width="44" height="25" rx="1" fill="#92400e"/>
        <rect x="30" y="35" width="20" height="15" rx="1" fill="#78350f"/>
        <path d="M30 35 Q40 28 50 35" fill="#78350f"/>
        <rect x="20" y="20" width="4" height="30" fill="#92400e"/>
        <rect x="56" y="20" width="4" height="30" fill="#92400e"/>
        <polygon points="22,20 22,14 18,20" fill="#b45309"/>
        <polygon points="58,20 58,14 62,20" fill="#b45309"/>
        <rect x="35" y="40" width="4" height="10" rx="2" fill="#d97706"/>
        <rect x="41" y="40" width="4" height="10" rx="2" fill="#d97706"/>
      </svg>
    ),
  },
  {
    name: "New Delhi",
    monument: "India Gate",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* India Gate */}
        <rect x="15" y="55" width="50" height="5" rx="1" fill="#1e293b"/>
        <rect x="18" y="28" width="8" height="27" fill="#d97706"/>
        <rect x="54" y="28" width="8" height="27" fill="#d97706"/>
        <rect x="15" y="22" width="50" height="8" rx="1" fill="#b45309"/>
        <path d="M26 55 Q40 35 54 55" fill="none" stroke="#92400e" strokeWidth="2"/>
        <rect x="35" y="15" width="10" height="7" rx="1" fill="#92400e"/>
        <circle cx="40" cy="13" r="3" fill="#f59e0b"/>
      </svg>
    ),
  },
  {
    name: "Bengaluru",
    monument: "Vidhana Soudha",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Vidhana Soudha */}
        <rect x="10" y="52" width="60" height="5" rx="1" fill="#1e293b"/>
        <rect x="15" y="35" width="50" height="17" rx="1" fill="#6b7280"/>
        <rect x="12" y="32" width="56" height="5" rx="1" fill="#4b5563"/>
        <rect x="20" y="38" width="6" height="14" rx="1" fill="#e2e8f0"/>
        <rect x="30" y="38" width="6" height="14" rx="1" fill="#e2e8f0"/>
        <rect x="44" y="38" width="6" height="14" rx="1" fill="#e2e8f0"/>
        <rect x="54" y="38" width="6" height="14" rx="1" fill="#e2e8f0"/>
        <rect x="33" y="22" width="14" height="10" rx="1" fill="#6b7280"/>
        <circle cx="40" cy="18" r="5" fill="#4b5563"/>
        <circle cx="40" cy="18" r="2" fill="#f59e0b"/>
      </svg>
    ),
  },
  {
    name: "Chennai",
    monument: "Marina Lighthouse",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Lighthouse */}
        <rect x="15" y="55" width="50" height="5" rx="1" fill="#1e293b"/>
        <path d="M32 55 L36 20 L44 20 L48 55Z" fill="#dc2626"/>
        <rect x="34" y="15" width="12" height="7" rx="1" fill="#991b1b"/>
        <circle cx="40" cy="12" r="4" fill="#fbbf24"/>
        <line x1="40" y1="8" x2="40" y2="3" stroke="#fbbf24" strokeWidth="1.5"/>
        <line x1="34" y1="12" x2="29" y2="10" stroke="#fbbf24" strokeWidth="1.5"/>
        <line x1="46" y1="12" x2="51" y2="10" stroke="#fbbf24" strokeWidth="1.5"/>
        <rect x="36" y="35" width="3" height="5" rx="1" fill="#fef2f2"/>
        <rect x="41" y="35" width="3" height="5" rx="1" fill="#fef2f2"/>
        <rect x="37" y="45" width="6" height="8" rx="1" fill="#fef2f2"/>
      </svg>
    ),
  },
  {
    name: "Hyderabad",
    monument: "Charminar",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Charminar */}
        <rect x="15" y="55" width="50" height="5" rx="1" fill="#1e293b"/>
        <rect x="20" y="30" width="40" height="25" rx="1" fill="#d4d4d8"/>
        <path d="M30 55 Q40 42 50 55" fill="#a1a1aa"/>
        <rect x="18" y="15" width="5" height="40" fill="#d4d4d8"/>
        <rect x="57" y="15" width="5" height="40" fill="#d4d4d8"/>
        <circle cx="20.5" cy="13" r="3" fill="#f59e0b"/>
        <circle cx="59.5" cy="13" r="3" fill="#f59e0b"/>
        <rect x="33" y="25" width="14" height="10" rx="1" fill="#a1a1aa"/>
        <path d="M33 25 Q40 18 47 25" fill="#d4d4d8"/>
      </svg>
    ),
  },
  {
    name: "Kolkata",
    monument: "Victoria Memorial",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Victoria Memorial */}
        <rect x="10" y="52" width="60" height="5" rx="1" fill="#1e293b"/>
        <rect x="15" y="38" width="50" height="14" rx="2" fill="#f1f5f9"/>
        <rect x="12" y="35" width="56" height="5" rx="1" fill="#e2e8f0"/>
        <path d="M30 35 Q40 22 50 35" fill="#f1f5f9"/>
        <rect x="38" y="18" width="4" height="17" fill="#e2e8f0"/>
        <circle cx="40" cy="15" r="4" fill="#e2e8f0"/>
        <circle cx="40" cy="15" r="2" fill="#f59e0b"/>
        <rect x="20" y="42" width="5" height="10" rx="2.5" fill="#cbd5e1"/>
        <rect x="30" y="42" width="5" height="10" rx="2.5" fill="#cbd5e1"/>
        <rect x="45" y="42" width="5" height="10" rx="2.5" fill="#cbd5e1"/>
        <rect x="55" y="42" width="5" height="10" rx="2.5" fill="#cbd5e1"/>
      </svg>
    ),
  },
  {
    name: "Ahmedabad",
    monument: "Sabarmati Ashram",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Spinning wheel + ashram */}
        <rect x="15" y="52" width="50" height="5" rx="1" fill="#1e293b"/>
        <rect x="22" y="38" width="36" height="14" rx="1" fill="#fef3c7"/>
        <polygon points="40,25 22,38 58,38" fill="#f59e0b"/>
        <rect x="35" y="42" width="10" height="10" rx="1" fill="#d97706"/>
        <circle cx="40" cy="47" r="3" fill="none" stroke="#92400e" strokeWidth="1"/>
        <line x1="40" y1="44" x2="40" y2="50" stroke="#92400e" strokeWidth="0.8"/>
        <line x1="37" y1="47" x2="43" y2="47" stroke="#92400e" strokeWidth="0.8"/>
        <rect x="25" y="42" width="4" height="7" rx="1" fill="#fbbf24"/>
        <rect x="51" y="42" width="4" height="7" rx="1" fill="#fbbf24"/>
      </svg>
    ),
  },
  {
    name: "Jaipur",
    monument: "Hawa Mahal",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Hawa Mahal */}
        <rect x="15" y="55" width="50" height="5" rx="1" fill="#1e293b"/>
        <rect x="22" y="20" width="36" height="35" rx="1" fill="#f87171"/>
        <polygon points="40,12 22,20 58,20" fill="#ef4444"/>
        {/* Windows grid */}
        {[25, 32, 39, 46, 53].map((x) =>
          [24, 32, 40, 48].map((y) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="4" height="5" rx="2" fill="#fecaca"/>
          ))
        )}
        <circle cx="40" cy="15" r="2" fill="#fbbf24"/>
      </svg>
    ),
  },
  {
    name: "Lucknow",
    monument: "Bara Imambara",
    svg: (
      <svg viewBox="0 0 80 80" className="w-14 h-14" fill="none">
        {/* Bara Imambara */}
        <rect x="10" y="52" width="60" height="5" rx="1" fill="#1e293b"/>
        <rect x="15" y="35" width="50" height="17" rx="1" fill="#fef3c7"/>
        <path d="M15 35 Q40 20 65 35" fill="#f59e0b"/>
        <rect x="13" y="22" width="4" height="30" fill="#fef3c7"/>
        <rect x="63" y="22" width="4" height="30" fill="#fef3c7"/>
        <circle cx="15" cy="20" r="3" fill="#f59e0b"/>
        <circle cx="65" cy="20" r="3" fill="#f59e0b"/>
        <rect x="28" y="40" width="6" height="12" rx="3" fill="#fbbf24"/>
        <rect x="37" y="40" width="6" height="12" rx="3" fill="#fbbf24"/>
        <rect x="46" y="40" width="6" height="12" rx="3" fill="#fbbf24"/>
      </svg>
    ),
  },
];

export default function CityPicker() {
  const [show, setShow] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cleanloop-city");
    if (saved) {
      setSelectedCity(saved);
    } else {
      setShow(true);
    }
  }, []);

  const handleSelect = (city: string) => {
    localStorage.setItem("cleanloop-city", city);
    setSelectedCity(city);
    setShow(false);
    window.dispatchEvent(new Event("city-changed"));
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-8 py-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold mb-1">
                <MapPin className="w-4 h-4" />
                SELECT YOUR CITY
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Where do you want the service?</h2>
              <p className="text-gray-500 text-sm mt-1">We&apos;ll connect you to the nearest CleanLoop outlet</p>
            </div>
          </div>
        </div>

        {/* City Grid */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => handleSelect(city.name)}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105 cursor-pointer"
              >
                <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gray-50 group-hover:bg-white transition-colors">
                  {city.svg}
                </div>
                <span className="font-semibold text-sm text-gray-800 group-hover:text-emerald-700 transition-colors">{city.name}</span>
                <span className="text-[10px] text-gray-400 group-hover:text-emerald-500 leading-tight text-center">{city.monument}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-8 py-4 bg-gray-50 rounded-b-3xl border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">You can change your city anytime from the header</p>
        </div>
      </div>
    </div>
  );
}

export function CityDisplay() {
  const [city, setCity] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setCity(localStorage.getItem("cleanloop-city"));
    const handler = () => setCity(localStorage.getItem("cleanloop-city"));
    window.addEventListener("city-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("city-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const handleSelect = (cityName: string) => {
    localStorage.setItem("cleanloop-city", cityName);
    setCity(cityName);
    setShowPicker(false);
    window.dispatchEvent(new Event("city-changed"));
  };

  if (!city) return null;

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors cursor-pointer"
      >
        <MapPin className="w-4 h-4 text-emerald-600" />
        {city}
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-8 py-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold mb-1">
                    <MapPin className="w-4 h-4" />
                    CHANGE CITY
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Select a different city</h2>
                </div>
                <button onClick={() => setShowPicker(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleSelect(c.name)}
                    className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer ${
                      city === c.name
                        ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10"
                        : "border-gray-100 hover:border-emerald-500 hover:bg-emerald-50"
                    }`}
                  >
                    <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gray-50 group-hover:bg-white transition-colors">
                      {c.svg}
                    </div>
                    <span className="font-semibold text-sm text-gray-800 group-hover:text-emerald-700 transition-colors">{c.name}</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-emerald-500 leading-tight text-center">{c.monument}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-8 py-4 bg-gray-50 rounded-b-3xl border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">Your services will be routed to the nearest outlet</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
