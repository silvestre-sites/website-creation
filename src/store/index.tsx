import React from "react";
import { I18nProvider } from "./I18nContext";
import { AuthProvider } from "./AuthContext";
import { JobsProvider } from "./JobsContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <JobsProvider>
          {children}
        </JobsProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
