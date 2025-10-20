// import { act, renderHook, waitFor } from "@testing-library/react";
// import { useProjectFilters } from "@/hooks/use-project-filters";
// import { ProjectStatus } from "@/lib/db/types";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";

// import '@testing-library/jest-dom'

// // Mock next/navigation
// jest.mock("next/navigation", () => ({
//   useRouter: jest.fn(),
//   usePathname: jest.fn(),
//   useSearchParams: jest.fn(),
// }));

// describe("useProjectFilters", () => {
//   // Mock data
//   const mockProjects = [
//     {
//       id: "1",
//       name: "Project A",
//       status: "active" as ProjectStatus,
//       companyId: "company1",
//     },
//     {
//       id: "2",
//       name: "Project B",
//       status: "completed" as ProjectStatus,
//       companyId: "company2",
//     },
//     {
//       id: "3",
//       name: "Project C",
//       status: "archived" as ProjectStatus,
//       companyId: "company1",
//     },
//   ];

//   // Mock functions
//   const mockPush = jest.fn();
//   const mockSetParam = jest.fn();
//   const mockDeleteParam = jest.fn();

//   beforeEach(() => {
//     // Reset mocks
//     jest.clearAllMocks();

//     // Setup router mock
//     (useRouter as jest.Mock).mockReturnValue({
//       push: mockPush,
//     });

//     // Setup pathname mock
//     (usePathname as jest.Mock).mockReturnValue("/projects");

//     // Setup search params mock
//     const searchParams = new URLSearchParams();
//     searchParams.toString = jest.fn().mockReturnValue("");
//     searchParams.set = mockSetParam;
//     searchParams.delete = mockDeleteParam;
//     (useSearchParams as jest.Mock).mockReturnValue(searchParams);

//     // Mock window.location
//     Object.defineProperty(window, "location", {
//       value: {
//         pathname: "/projects",
//         search: "",
//       },
//       writable: true,
//     });
//   });

//   describe("Initial State", () => {
//     it("should initialize with default values", () => {
//       const { result } = renderHook(() => useProjectFilters());

//       expect(result.current.filters).toEqual({
//         status: "all",
//         companyId: "all",
//         search: "",
//       });
//     });

//     it("should initialize from URL parameters", () => {
//       const searchParams = new URLSearchParams();
//       searchParams.set("status", "active");
//       searchParams.set("company", "company1");
//       searchParams.set("search", "test");
//       (useSearchParams as jest.Mock).mockReturnValue(searchParams);

//       const { result } = renderHook(() => useProjectFilters());

//       expect(result.current.filters).toEqual({
//         status: "active",
//         companyId: "company1",
//         search: "test",
//       });
//     });
//   });

//   describe("Loading States", () => {
//     it("should set loading state during status update", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setStatus("active");
//       });

//       expect(result.current.loading.status).toBe(true);

//       await waitFor(() => {
//         expect(result.current.loading.status).toBe(false);
//       });
//     });

//     it("should set loading state during company update", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setCompanyId("company1");
//       });

//       expect(result.current.loading.company).toBe(true);

//       await waitFor(() => {
//         expect(result.current.loading.company).toBe(false);
//       });
//     });

//     it("should set loading state during search update", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setSearch("test");
//       });

//       expect(result.current.loading.search).toBe(true);

//       await waitFor(() => {
//         expect(result.current.loading.search).toBe(false);
//       });
//     });

//     it("should set all loading states during reset", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.resetFilters();
//       });

//       expect(result.current.loading).toEqual({
//         status: true,
//         company: true,
//         search: true,
//       });

//       await waitFor(() => {
//         expect(result.current.loading).toEqual({
//           status: false,
//           company: false,
//           search: false,
//         });
//       });
//     });
//   });

//   describe("URL Parameter Validation", () => {
//     it("should handle invalid status parameter", () => {
//       const searchParams = new URLSearchParams();
//       searchParams.set("status", "invalid");
//       (useSearchParams as jest.Mock).mockReturnValue(searchParams);

//       const { result } = renderHook(() => useProjectFilters());

//       expect(result.current.filters.status).toBe("all");
//     });

//     it("should handle invalid company ID", () => {
//       const searchParams = new URLSearchParams();
//       searchParams.set("company", "");
//       (useSearchParams as jest.Mock).mockReturnValue(searchParams);

//       const { result } = renderHook(() => useProjectFilters());

//       expect(result.current.filters.companyId).toBe("all");
//     });

//     it("should truncate long search queries", () => {
//       const longSearch = "a".repeat(150);
//       const searchParams = new URLSearchParams();
//       searchParams.set("search", longSearch);
//       (useSearchParams as jest.Mock).mockReturnValue(searchParams);

//       const { result } = renderHook(() => useProjectFilters());

//       expect(result.current.filters.search.length).toBe(100);
//     });
//   });

//   describe("Filter Application", () => {
//     it("should filter by status", () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setStatus("active");
//       });

//       const filtered = result.current.applyFilters(mockProjects);
//       expect(filtered).toHaveLength(1);
//       expect(filtered[0].name).toBe("Project A");
//     });

//     it("should filter by company", () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setCompanyId("company1");
//       });

//       const filtered = result.current.applyFilters(mockProjects);
//       expect(filtered).toHaveLength(2);
//       expect(filtered.map(p => p.name)).toEqual(["Project A", "Project C"]);
//     });

//     it("should filter by search query", () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setSearch("B");
//       });

//       const filtered = result.current.applyFilters(mockProjects);
//       expect(filtered).toHaveLength(1);
//       expect(filtered[0].name).toBe("Project B");
//     });

//     it("should apply multiple filters", () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setStatus("active");
//         result.current.setCompanyId("company1");
//       });

//       const filtered = result.current.applyFilters(mockProjects);
//       expect(filtered).toHaveLength(1);
//       expect(filtered[0].name).toBe("Project A");
//     });
//   });

//   describe("URL Synchronization", () => {
//     it("should update URL when status changes", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setStatus("active");
//       });

//       await waitFor(() => {
//         expect(mockPush).toHaveBeenCalledWith(
//           expect.stringContaining("status=active"),
//           expect.any(Object)
//         );
//       });
//     });

//     it("should update URL when company changes", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setCompanyId("company1");
//       });

//       await waitFor(() => {
//         expect(mockPush).toHaveBeenCalledWith(
//           expect.stringContaining("company=company1"),
//           expect.any(Object)
//         );
//       });
//     });

//     it("should update URL when search changes", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.setSearch("test");
//       });

//       await waitFor(() => {
//         expect(mockPush).toHaveBeenCalledWith(
//           expect.stringContaining("search=test"),
//           expect.any(Object)
//         );
//       });
//     });

//     it("should clean URL when filters are reset", async () => {
//       const { result } = renderHook(() => useProjectFilters());

//       act(() => {
//         result.current.resetFilters();
//       });

//       await waitFor(() => {
//         expect(mockPush).toHaveBeenCalledWith("/projects", expect.any(Object));
//       });
//     });
//   });
// });
