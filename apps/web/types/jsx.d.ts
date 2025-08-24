declare namespace JSX {
  interface IntrinsicElements {
    // Company elements
    company: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    companies: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    id: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    name: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    role: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'start-date': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'end-date': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Project elements  
    project: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    projects: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    description: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    status: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'company-id': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Achievement elements
    achievement: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    achievements: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    title: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    summary: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    details: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'event-start': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'event-end': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Repository elements
    repository: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'remote-url': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Commit elements
    commit: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    message: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    hash: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    author: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    date: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}