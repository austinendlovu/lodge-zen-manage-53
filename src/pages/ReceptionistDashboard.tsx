import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { RoomGrid } from "@/components/dashboard/RoomGrid";
import { StatusLegend } from "@/components/dashboard/StatusLegend";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckSquare, Plus, UserCheck, UserX, Search, Clock } from "lucide-react";
import { ManualAssignmentForm } from "@/components/booking/ManualAssignmentForm";
import { BookingForm } from "@/components/booking/BookingForm";
import { CheckInOutForm } from "@/components/booking/CheckInOutForm";
import { AllBookingsTable } from "@/components/booking/AllBookingsTable";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ReceptionistDashboardProps {
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

interface TaskCount {
  checkIns: number;
  checkOuts: number;
  reservations: number;
  roomInspections: number;
}

interface UpcomingCheckout {
  bookingCode: string;
  guestName: string;
  roomNumber: string;
  remainingTime: string;
}

const ReceptionistDashboard: React.FC<ReceptionistDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [taskCounts, setTaskCounts] = useState<TaskCount>({ 
    checkIns: 0, 
    checkOuts: 0, 
    reservations: 0, 
    roomInspections: 0 
  });
  const [upcomingCheckouts, setUpcomingCheckouts] = useState<UpcomingCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8080/api/bookings');
        
        if (!response.ok) {
          throw new Error(`Error fetching bookings: ${response.statusText}`);
        }
        
        const data: Booking[] = await response.json();
        
        // Calculate task counts
        const today = new Date().toISOString().split('T')[0];
        
        const checkIns = data.filter(b => 
          b.scheduledCheckIn.includes(today) && b.status === "RESERVED").length;
          
        const checkOuts = data.filter(b => 
          b.scheduledCheckOut.includes(today) && b.status === "CHECKED_IN").length;
          
        const reservations = data.filter(b => 
          b.status === "RESERVED").length;
        
        // For upcoming checkouts (next 2 hours)
        const checkedInBookings = data.filter(b => b.status === "CHECKED_IN");
        
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
          
        setTaskCounts({
          checkIns,
          checkOuts,
          reservations,
          roomInspections: 4 // Mock data for room inspections since API doesn't provide this
        });
        
        setUpcomingCheckouts(upcomingCheckoutsList);
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
    
    fetchBookings();
    
    // Refresh data every minute for time-sensitive information
    const refreshInterval = setInterval(fetchBookings, 60000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  // Process checkout
  const handleCheckout = async (bookingCode: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/guest/check-out?bookingCode=${bookingCode}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Error processing checkout: ${response.statusText}`);
      }
      
      toast({
        title: "Success",
        description: `Guest checked out successfully`,
      });
      
      const updatedCheckouts = upcomingCheckouts.filter(checkout => checkout.bookingCode !== bookingCode);
      setUpcomingCheckouts(updatedCheckouts);
      
    } catch (err) {
      console.error("Error checking out:", err);
      toast({
        title: "Error",
        description: "Failed to process checkout",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={onLogout} />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="mb-4 sm:mb-6 flex flex-col gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Receptionist Dashboard</h2>
              <p className="text-sm sm:text-base text-gray-600">Manage guest check-ins and room availability</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(
              "mb-4 sm:mb-6",
              isMobile ? "grid grid-cols-2 w-full gap-1" : "flex w-auto"
            )}>
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
              <TabsTrigger value="rooms" className="text-xs sm:text-sm">Rooms</TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs sm:text-sm">Bookings</TabsTrigger>
              <TabsTrigger value="check-in-out" className="text-xs sm:text-sm">Check-In/Out</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="lg:col-span-3">
                  <Card className="mb-4 sm:mb-6">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button 
                          className="h-20 sm:h-24 flex-col gap-2 bg-accent hover:bg-accent/90 text-xs sm:text-sm"
                          onClick={() => {
                            setShowAssignForm(true);
                            setShowBookingForm(false);
                            setShowCheckInForm(false);
                          }}
                        >
                          <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
                          <span>Manual Room Assignment</span>
                        </Button>
                        
                        <Button 
                          className="h-20 sm:h-24 flex-col gap-2 bg-accent hover:bg-accent/90 text-xs sm:text-sm"
                          onClick={() => {
                            setShowBookingForm(true);
                            setShowAssignForm(false);
                            setShowCheckInForm(false);
                          }}
                        >
                          <Calendar className="h-4 w-4 sm:h-6 sm:w-6" />
                          <span>New Booking</span>
                        </Button>
                        
                        <Button 
                          className="h-20 sm:h-24 flex-col gap-2 bg-accent hover:bg-accent/90 text-xs sm:text-sm"
                          onClick={() => {
                            setShowCheckInForm(true);
                            setShowAssignForm(false);
                            setShowBookingForm(false);
                          }}
                        >
                          <UserCheck className="h-4 w-4 sm:h-6 sm:w-6" />
                          <span>Check-In/Out</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {showAssignForm && (
                    <Card className="mb-4 sm:mb-6">
                      <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">Manual Room Assignment</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Walk-in guests and special assignments</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ManualAssignmentForm onComplete={() => setShowAssignForm(false)} />
                      </CardContent>
                    </Card>
                  )}
                  
                  {showBookingForm && (
                    <Card className="mb-4 sm:mb-6">
                      <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">New Booking</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Create a new booking for a guest</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <BookingForm isReceptionist={true} onComplete={() => setShowBookingForm(false)} />
                      </CardContent>
                    </Card>
                  )}
                  
                  {showCheckInForm && (
                    <Card className="mb-4 sm:mb-6">
                      <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">Guest Check-In/Out</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Process guest check-ins and check-outs</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CheckInOutForm onComplete={() => setShowCheckInForm(false)} />
                      </CardContent>
                    </Card>
                  )}
                  
                  <RoomGrid />
                </div>
                
                <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                  <StatusLegend />
                  
                  {loading ? (
                    <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border flex justify-center items-center h-32">
                      <p className="text-xs sm:text-sm">Loading dashboard data...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border">
                        <h3 className="font-medium text-sm sm:text-lg mb-3">Today's Tasks</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                            <span className="flex items-center">
                              <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-blue-600" />
                              <span className="text-xs sm:text-sm">Check-ins</span>
                            </span>
                            <span className="font-medium text-blue-600 text-xs sm:text-sm">{taskCounts.checkIns}</span>
                          </div>
                          <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                            <span className="flex items-center">
                              <UserX className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-green-600" />
                              <span className="text-xs sm:text-sm">Check-outs</span>
                            </span>
                            <span className="font-medium text-green-600 text-xs sm:text-sm">{taskCounts.checkOuts}</span>
                          </div>
                          <div className="flex items-center justify-between bg-purple-50 p-2 rounded">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-purple-600" />
                              <span className="text-xs sm:text-sm">Reservations</span>
                            </span>
                            <span className="font-medium text-purple-600 text-xs sm:text-sm">{taskCounts.reservations}</span>
                          </div>
                          <div className="flex items-center justify-between bg-yellow-50 p-2 rounded">
                            <span className="flex items-center">
                              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-yellow-600" />
                              <span className="text-xs sm:text-sm">Room Inspections</span>
                            </span>
                            <span className="font-medium text-yellow-600 text-xs sm:text-sm">{taskCounts.roomInspections}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border">
                        <h3 className="font-medium text-sm sm:text-lg mb-3">Upcoming Check-outs</h3>
                        {upcomingCheckouts.length > 0 ? (
                          <div className="space-y-3">
                            {upcomingCheckouts.map(checkout => (
                              <div key={checkout.bookingCode} className="flex justify-between items-center bg-amber-50 p-2 rounded-md">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium truncate">Room {checkout.roomNumber} - {checkout.guestName}</p>
                                  <p className="text-xs text-gray-500 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" /> {checkout.remainingTime} remaining
                                  </p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-xs ml-2"
                                  onClick={() => handleCheckout(checkout.bookingCode)}
                                >
                                  Check-out
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4 text-xs sm:text-sm">No upcoming checkouts in the next 2 hours</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="rooms">
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg sm:text-xl font-medium">Room Status Overview</h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="search"
                      placeholder="Search rooms..."
                      className="w-full pl-8 h-9 rounded-md border border-input text-sm"
                    />
                  </div>
                  <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Room
                  </Button>
                </div>
              </div>
              <RoomGrid />
            </TabsContent>
            
            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">All Bookings</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Manage all current and upcoming bookings</CardDescription>
                    </div>
                    <Button onClick={() => setActiveTab("dashboard")} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      New Booking
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <AllBookingsTable />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="check-in-out">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Check-In/Out Management</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Process guest check-ins and check-outs</CardDescription>
                </CardHeader>
                <CardContent>
                  <CheckInOutForm fullPage={true} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
