export interface RepositoryCommitHistory {
  repository: {
    name: string;
    path: string;
  };
  commits: Array<{
    hash: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    date: string;
    prDetails?: {
      title: string;
      description: string;
      number: number;
    };
  }>;
}
