import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoomGrid } from "@/components/dashboard/RoomGrid";
import { StatusLegend } from "@/components/dashboard/StatusLegend";
import { 
  BarChart3, 
  Calendar, 
  Users, 
  CreditCard, 
  Home, 
  PlusCircle, 
  Boxes, 
  FileText, 
  Clock 
} from "lucide-react";
import { AdminOverviewStats } from "@/components/admin/AdminOverviewStats";
import { RoomsManagement } from "@/components/admin/RoomsManagement";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { EmployeeManagement } from "@/components/admin/EmployeeManagement";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AdminDashboardProps {
  onLogout: () => void;
}

interface Room {
  id: number;
  roomNumber: string;
  status: string;
  floor: number;
  specialFeatures: string;
  lastCleanedAt: string;
}

interface Booking {
  id: number;
  room: Room;
  guestName: string;
  email: string;
  phoneNumber: string;
  type: string;
  date: string;
  startTime: string;
  durationHours: number;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  bookingCode: string;
  status: string;
  totalCharges: number;
  scheduledCheckOut: string;
  scheduledCheckIn: string;
}

interface UpcomingCheckout {
  bookingCode: string;
  guestName: string;
  roomNumber: string;
  remainingTime: string;
}

interface DailySummary {
  checkIns: number;
  checkOuts: number;
  revenue: number;
  occupancyRate: number;
  pendingPayments: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [upcomingCheckouts, setUpcomingCheckouts] = useState<UpcomingCheckout[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    checkIns: 0,
    checkOuts: 0,
    revenue: 0,
    occupancyRate: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch rooms data
        const roomsResponse = await fetch('http://localhost:8080/api/rooms');
        if (!roomsResponse.ok) {
          throw new Error(`Error fetching rooms: ${roomsResponse.statusText}`);
        }
        const roomsData = await roomsResponse.json();
        setRooms(roomsData);
        
        // Fetch bookings data
        const bookingsResponse = await fetch('http://localhost:8080/api/bookings');
        if (!bookingsResponse.ok) {
          throw new Error(`Error fetching bookings: ${bookingsResponse.statusText}`);
        }
        const bookingsData: Booking[] = await bookingsResponse.json();
        
        // For upcoming checkouts (next 2 hours)
        const checkedInBookings = bookingsData.filter(b => b.status === "CHECKED_IN");
        
        const upcomingCheckoutsList: UpcomingCheckout[] = checkedInBookings
          .map(booking => {
            const now = new Date();
            const checkoutTime = new Date(booking.scheduledCheckOut);
            const timeDiff = checkoutTime.getTime() - now.getTime();
            const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            return {
              bookingCode: booking.bookingCode,
              guestName: booking.guestName,
              roomNumber: booking.room.roomNumber,
              remainingTime: `${hoursRemaining}hr ${minutesRemaining}min`,
              remainingMs: timeDiff
            };
          })
          .filter(checkout => checkout.remainingMs > 0 && checkout.remainingMs <= 2 * 60 * 60 * 1000)
          .sort((a, b) => a.remainingMs - b.remainingMs)
          .slice(0, 3)
          .map(({ bookingCode, guestName, roomNumber, remainingTime }) => ({
            bookingCode, guestName, roomNumber, remainingTime
          }));
          
        setUpcomingCheckouts(upcomingCheckoutsList);
        
        // Calculate today's summary
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Today's check-ins and check-outs
        const todayCheckIns = bookingsData.filter(booking => {
          const checkInDate = new Date(booking.scheduledCheckIn);
          checkInDate.setHours(0, 0, 0, 0);
          return checkInDate.getTime() === today.getTime();
        }).length;
        
        const todayCheckOuts = bookingsData.filter(booking => {
          const checkOutDate = new Date(booking.scheduledCheckOut);
          checkOutDate.setHours(0, 0, 0, 0);
          return checkOutDate.getTime() === today.getTime();
        }).length;
        
        // Today's revenue
        const todayRevenue = bookingsData
          .filter(booking => {
            const bookingDate = new Date(booking.scheduledCheckIn);
            bookingDate.setHours(0, 0, 0, 0);
            return bookingDate.getTime() === today.getTime();
          })
          .reduce((sum, booking) => sum + booking.totalCharges, 0);
        
        // Occupancy rate
        const totalRooms = roomsData.length; // Get real total rooms count
        const occupiedRooms = bookingsData.filter(booking => booking.status === "CHECKED_IN").length;
        const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
        
        // Count bookings with potential pending payments (placeholder logic)
        const pendingPayments = bookingsData.filter(booking => booking.status === "RESERVED").length;
        
        setDailySummary({
          checkIns: todayCheckIns,
          checkOuts: todayCheckOuts,
          revenue: todayRevenue,
          occupancyRate,
          pendingPayments
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh data every minute for time-sensitive information
    const refreshInterval = setInterval(fetchData, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [toast]);

  const handleLogout = () => {
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    onLogout();
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={handleLogout} />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(
              "grid gap-1 mb-4 sm:mb-6",
              isMobile ? "grid-cols-2 w-full" : "grid-cols-5 w-auto"
            )}>
              <TabsTrigger value="overview" className={cn(
                "flex items-center",
                isMobile ? "text-xs px-2" : "text-sm px-4"
              )}>
                <Home className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="rooms" className={cn(
                "flex items-center",
                isMobile ? "text-xs px-2" : "text-sm px-4"
              )}>
                <Boxes className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>Rooms</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className={cn(
                "flex items-center",
                isMobile ? "text-xs px-2" : "text-sm px-4"
              )}>
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>Bookings</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className={cn(
                "flex items-center",
                isMobile ? "text-xs px-2" : "text-sm px-4"
              )}>
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>Staff</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className={cn(
                "flex items-center",
                isMobile ? "text-xs px-2" : "text-sm px-4"
              )}>
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>Reports</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <AdminOverviewStats />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg font-medium">Quick Actions</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Perform common tasks quickly</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setActiveTab("rooms")}>
                      <Home className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Manage Rooms
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setActiveTab("bookings")}>
                      <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> View Bookings
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setActiveTab("employees")}>
                      <Users className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add Employee
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setActiveTab("reports")}>
                      <BarChart3 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> View Reports
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg font-medium">Upcoming Check-outs</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Check-outs in the next 2 hours</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-4 text-gray-500 text-xs sm:text-sm">Loading checkouts...</div>
                    ) : upcomingCheckouts.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingCheckouts.map(checkout => (
                          <div key={checkout.bookingCode} className="flex justify-between items-center bg-amber-50 p-2 rounded-md">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">Room {checkout.roomNumber} - {checkout.guestName}</p>
                              <p className="text-xs text-gray-500">Check out in {checkout.remainingTime}</p>
                            </div>
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 ml-2" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-xs sm:text-sm">No upcoming checkouts in the next 2 hours</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg font-medium">Today's Summary</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Key metrics for today</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm">Check-ins:</span>
                      <span className="font-medium text-xs sm:text-sm">{dailySummary.checkIns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm">Check-outs:</span>
                      <span className="font-medium text-xs sm:text-sm">{dailySummary.checkOuts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm">Revenue:</span>
                      <span className="font-medium text-green-600 text-xs sm:text-sm">${dailySummary.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm">Occupancy Rate:</span>
                      <span className="font-medium text-xs sm:text-sm">{dailySummary.occupancyRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm">Pending Payments:</span>
                      <span className="font-medium text-amber-600 text-xs sm:text-sm">{dailySummary.pendingPayments}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="rooms">
              <RoomsManagement />
            </TabsContent>
            
            <TabsContent value="bookings">
              <BookingsTable />
            </TabsContent>
            
            <TabsContent value="employees">
              <EmployeeManagement />
            </TabsContent>
            
            <TabsContent value="reports">
              <ReportsPanel />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
