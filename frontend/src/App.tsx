import { useEffect, useState } from "react";
import axios from "axios";
import { Activity, CheckCircle2, AlertCircle } from "lucide-react";

interface HealthResponse {
  status: string;
  message: string;
  app: string;
  env: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    axios
      .get<HealthResponse>("http://localhost:8000/health")
      .then((res) => {
        setHealth(res.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to reach backend API");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-indigo-400" />
          <h1 className="text-xl font-bold tracking-tight">TutorFlow</h1>
        </div>

        <p className="text-sm text-slate-400">
          Frontend client connected to containerized development network.
        </p>

        <div className="rounded-lg bg-slate-950/60 p-4 border border-slate-800/80">
          <div className="text-xs uppercase font-semibold text-slate-500 mb-2">
            Backend API Health
          </div>

          {loading && <p className="text-sm text-slate-400">Checking connection...</p>}

          {error && (
            <div className="flex items-center space-x-2 text-rose-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {health && (
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{health.message}</span>
              </div>
              <div className="text-xs text-slate-500">
                Service: <span className="text-slate-300">{health.app}</span> ({health.env})
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}