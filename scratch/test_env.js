console.log("Environment keys:", Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("KEY") || k.includes("VITE")));
