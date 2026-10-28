import { useState, useEffect } from "react";
import { QueryProvider } from "./common/providers/QueryProvider";
import { AppShell, type NavTab } from "./common/layouts/AppShell";
import { HomeView } from "./features/home/home-view";
import { PointsView } from "./features/points/points-view";
import { ScheduleView } from "./features/schedule/schedule-view";
import { CompanyView } from "./features/company/company-view";
import { ProfileView } from "./features/profile/profile-view";
import { SignInView } from "./features/auth/SignInView";
import { SignUpView } from "./features/auth/SignUpView";
import { ForgotPasswordView } from "./features/auth/ForgotPasswordView";
import { useAuthStore } from "./features/auth/auth.store";
import type { WasteType } from "./features/points/types/points.types";
import "./index.css";

export default function App() {
  const { isAuthenticated, user, checkSession } = useAuthStore();
  const [authScreen, setAuthScreen] = useState<"signin" | "signup" | "forgot">("signin");
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [selectedComuna, setSelectedComuna] = useState<number>(user?.comuna ?? 1);
  const [selectedWasteType, setSelectedWasteType] = useState<WasteType | undefined>(undefined);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (user?.comuna) {
      setSelectedComuna(user.comuna);
    }
  }, [user?.comuna]);

  return (
    <QueryProvider>
      {!isAuthenticated ? (
        <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-[420px] h-screen sm:h-[844px] bg-white sm:rounded-[44px] shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
            {authScreen === "signin" && (
              <SignInView
                onGoToSignUp={() => setAuthScreen("signup")}
                onGoToForgotPassword={() => setAuthScreen("forgot")}
                onSuccess={() => {}}
              />
            )}
            {authScreen === "signup" && (
              <SignUpView
                onGoToSignIn={() => setAuthScreen("signin")}
                onSuccess={() => {}}
              />
            )}
            {authScreen === "forgot" && (
              <ForgotPasswordView
                onBackToSignIn={() => setAuthScreen("signin")}
              />
            )}
          </div>
        </div>
      ) : (
        <AppShell
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== "containers" && tab !== "routes") {
              setSelectedWasteType(undefined);
            }
          }}
          selectedComuna={selectedComuna}
          onSelectComuna={(comuna) => {
            setSelectedComuna(comuna);
          }}
        >
          {activeTab === "home" && (
            <HomeView
              selectedComuna={selectedComuna}
              onNavigateToTab={setActiveTab}
              onSelectWasteType={(type) => {
                setSelectedWasteType(type);
                setActiveTab("containers");
              }}
            />
          )}

          {(activeTab === "containers" || activeTab === "routes") && (
            <PointsView
              selectedComuna={selectedComuna}
              initialWasteType={selectedWasteType}
              onSelectComuna={setSelectedComuna}
              onNavigateToHome={() => setActiveTab("home")}
            />
          )}

          {activeTab === "schedule" && (
            <ScheduleView selectedComuna={selectedComuna} />
          )}

          {activeTab === "company" && (
            <CompanyView />
          )}

          {activeTab === "profile" && (
            <ProfileView
              selectedComuna={selectedComuna}
              onSelectComuna={setSelectedComuna}
              onOpenLocationModal={() => {
                // Selector de comuna integrado en el perfil y shell
              }}
              onNavigateToTab={setActiveTab}
              onRequireAuth={() => setAuthScreen("signin")}
            />
          )}
        </AppShell>
      )}
    </QueryProvider>
  );
}
