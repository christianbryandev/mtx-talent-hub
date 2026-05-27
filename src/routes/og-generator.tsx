import { createFileRoute } from "@tanstack/react-router";
import mtxLogo from "@/assets/mtx-hub-logo.png";

export const Route = createFileRoute("/og-generator")({
  component: OGGenerator,
});

function OGGenerator() {
  return (
    <div 
      id="og-image"
      className="flex items-center justify-center bg-[#050505] overflow-hidden"
      style={{ width: "1200px", height: "630px" }}
    >
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-600 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-800 blur-[120px]" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" 
           style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} 
      />

      <div className="relative flex flex-col items-center">
        <div className="mb-8 p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
          <img
            src={mtxLogo}
            alt="MTX Hub"
            className="h-32 w-auto drop-shadow-[0_0_30px_rgba(192,38,211,0.5)]"
          />
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase mb-2">
            MTX Hub
          </h1>
          <p className="text-xl font-medium text-fuchsia-400 tracking-[0.2em] uppercase opacity-80">
            Multiplicando Talentos
          </p>
        </div>
      </div>
    </div>
  );
}
