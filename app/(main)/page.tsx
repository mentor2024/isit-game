import Link from "next/link";

export default function Home() {
  return (
    // Added -mt-20 to pull up behind NavBar (which will be transparent)
    <div className="relative min-h-[calc(100vh)] w-full flex flex-col items-center justify-center p-4 overflow-hidden -mt-20">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/landing-bg.png')` }}
      />

      {/* Overlay content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-8 py-12 px-6 pt-32">

        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight drop-shadow-sm">
            Discover your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Awareness Quotient
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-700">
            — in just three questions
          </p>
        </div>

        <p className="text-lg text-gray-600 font-bold">No sign-up required.</p>

        <Link href="/poll" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-[#EFBF04] to-[#C29B0C] rounded-full hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 shadow-xl">
          <span>Begin Your Awareness Assessment</span>
          <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </Link>
      </div>
    </div>
  );
}
