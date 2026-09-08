import React from "react";
import { Toaster } from "sonner";
import { AppRoutes } from "@/routes";

export const App: React.FC = () => {
  return (
    <>
      {/* Global toast notification layer */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        theme="system"
      />
      
      {/* Application Routing Engine */}
      <AppRoutes />
    </>
  );
};

export default App;