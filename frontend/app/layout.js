import './globals.css';

export const metadata = {
  title: 'Recruitment Screening & Candidate Evaluation',
  description: 'Recruitment Screening and Candidate Evaluation POC Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
