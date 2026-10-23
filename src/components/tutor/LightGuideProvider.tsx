import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import TutorButton from "./TutorButton";
import { resolveRoute } from "./routeContext";

/** Extra details a page can supply (e.g. the session reader's titles). */
export interface TutorContext {
  unit_id?: string;
  session_id?: string;
  pillar_name?: string;
  unit_title?: string;
  session_title?: string;
}

const LightGuideContext = createContext<Dispatch<SetStateAction<TutorContext | null>> | null>(null);

export function useLightGuideContext() {
  const setContext = useContext(LightGuideContext);
  if (!setContext) throw new Error("Light Guide requires its app-root provider");
  return setContext;
}

/** Mounted once inside the router; the orb + panel are portalled into document.body. */
export default function LightGuideProvider({ children }: { children: ReactNode }) {
  const [pageContext, setContext] = useState<TutorContext | null>(null);
  const { pathname } = useLocation();
  const route = resolveRoute(pathname);
  return (
    <LightGuideContext.Provider value={setContext}>
      {children}
      {route && createPortal(<TutorButton route={route} pageContext={pageContext} />, document.body)}
    </LightGuideContext.Provider>
  );
}
