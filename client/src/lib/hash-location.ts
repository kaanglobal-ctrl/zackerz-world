import { useState, useEffect } from "react";
import { navigate } from "wouter/use-hash-location";

export const useHashLocation = ({ ssrPath = "/" } = {}) => {
  const [location, setLocation] = useState(ssrPath);

  useEffect(() => {
    setLocation(window.location.hash.replace(/^#/, "") || "/");
  }, []);

  useEffect(() => {
    const onHashChange = () =>
      setLocation(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  return [location, navigate] as const;
};
