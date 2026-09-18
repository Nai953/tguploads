import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface RouteMatch {
  path: string;
  pathname: string;
  params: Record<string, string>;
  search: string;
  hash: string;
}

interface RouterContextType extends RouteMatch {
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType>({
  path: '/',
  pathname: '/',
  params: {},
  search: '',
  hash: '',
  navigate: () => {},
});

function getRouteState(): RouteMatch {
  if (typeof window === 'undefined') {
    return { path: '/', pathname: '/', params: {}, search: '', hash: '' };
  }

  let pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  // Check if someone arrived via hash-based share url e.g. #/share/:token
  const hashShareMatch = hash.match(/^#\/share\/([a-zA-Z0-9_-]+)/);
  if (hashShareMatch && hashShareMatch[1]) {
    pathname = `/share/${hashShareMatch[1]}`;
  } else if (hash.startsWith('#/')) {
    pathname = hash.slice(1);
  }

  // Normalize path
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Parse path parameters (e.g. /share/:token, /download/:token, /file/:token)
  const params: Record<string, string> = {};
  const shareMatch = pathname.match(/^\/(?:share|download|file)\/([a-zA-Z0-9_-]+)/);
  if (shareMatch && shareMatch[1]) {
    params.token = shareMatch[1];
  }

  const fullPath = pathname + search + (hash.startsWith('#/') ? '' : hash);

  return {
    path: fullPath,
    pathname,
    params,
    search,
    hash
  };
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteMatch>(getRouteState);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getRouteState());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;

    // Handle hash or full URL
    let target = to;
    if (!target.startsWith('/') && !target.startsWith('#') && !target.startsWith('http')) {
      target = '/' + target;
    }

    if (options?.replace) {
      window.history.replaceState(null, '', target);
    } else {
      window.history.pushState(null, '', target);
    }

    setRoute(getRouteState());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RouterContext.Provider value={{ ...route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
  activeClassName?: string;
  className?: string;
  children: ReactNode;
}

export const Link: React.FC<LinkProps> = ({
  to,
  replace = false,
  activeClassName = '',
  className = '',
  children,
  onClick,
  ...props
}) => {
  const { pathname, navigate } = useRouter();

  // Normalize target pathname for active check
  const targetPath = to.split('?')[0].split('#')[0];
  const isActive = pathname === targetPath || (targetPath !== '/' && pathname.startsWith(targetPath));

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    
    // Allow modifier keys (cmd+click, ctrl+click, etc.) to open in new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    e.preventDefault();
    navigate(to, { replace });
  };

  const combinedClasses = `${className} ${isActive ? activeClassName : ''}`.trim();

  return (
    <a href={to} onClick={handleClick} className={combinedClasses} {...props}>
      {children}
    </a>
  );
};
