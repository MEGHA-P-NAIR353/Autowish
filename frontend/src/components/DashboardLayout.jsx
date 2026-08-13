import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { Menu } from 'lucide-react';

// const DashboardLayout = ({ children }) => {
//   const [sidebarOpen, setSidebarOpen] = useState(false);

//   return (
//     <div className="min-h-screen bg-[#0F172A] flex">
//       {/* Desktop Sidebar */}
//       <div className="hidden lg:block">
//         <Sidebar />
//       </div>

//       {/* Mobile Sidebar */}
//       {sidebarOpen && (
//         <div className="lg:hidden fixed inset-0 z-50 bg-black/70" onClick={() => setSidebarOpen(false)}>
//           <div onClick={e => e.stopPropagation()}>
//             <Sidebar />
//           </div>
//         </div>
//       )}

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col min-w-0">
//         <TopNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
//         <main className="flex-1 p-6 lg:p-8 overflow-auto">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// };
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-[#0F172A] flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70" onClick={() => setSidebarOpen(false)}>
          <div onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
