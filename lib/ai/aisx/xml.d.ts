declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
  }
}


// Define XML namespace for our custom elements
// declare namespace JSX {
//   interface IntrinsicElements {
//     companies: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     company: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     projects: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     project: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     name: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     role: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     description: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     status: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//     title: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >;
//   }
// }