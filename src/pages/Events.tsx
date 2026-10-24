import { Calendar, Clock, Users, Video } from "lucide-react";
import StickyNav from "@/components/StickyNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Events = () => {
  const upcomingEvents = [
    {
      id: 1,
      title: "Forex Market Analysis: Live Trading Session",
      date: "March 15, 2025",
      time: "10:00 AM - 12:00 PM EAT",
      type: "Live Webinar",
      instructor: "Master Trader John Kamau",
      category: "Financial",
      attendees: 124,
      isPremium: true,
    },
    {
      id: 2,
      title: "Spiritual Wealth: Unlocking Your Divine Purpose",
      date: "March 18, 2025",
      time: "6:00 PM - 7:30 PM EAT",
      type: "Workshop",
      instructor: "Dr. Grace Mwangi",
      category: "Spiritual",
      attendees: 89,
      isPremium: false,
    },
    {
      id: 3,
      title: "AI & Machine Learning: Career Breakthrough Strategies",
      date: "March 22, 2025",
      time: "3:00 PM - 5:00 PM EAT",
      type: "Mentorship Session",
      instructor: "Tech Lead Sarah Otieno",
      category: "ICT",
      attendees: 156,
      isPremium: true,
    },
    {
      id: 4,
      title: "YouTube Automation Success Stories & Q&A",
      date: "March 25, 2025",
      time: "7:00 PM - 8:30 PM EAT",
      type: "Live Q&A",
      instructor: "Content Creator David Njoroge",
      category: "Income",
      attendees: 203,
      isPremium: false,
    },
  ];

  const pastEvents = [
    {
      id: 5,
      title: "Financial Freedom Masterclass",
      date: "February 28, 2025",
      recording: true,
    },
    {
      id: 6,
      title: "Cybersecurity Trends 2025",
      date: "February 20, 2025",
      recording: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Live Events & Webinars
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Join our expert-led sessions, connect with fellow learners, and accelerate your journey to mastery. 
              Experience transformative learning through live interaction and real-time guidance.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-foreground">Upcoming Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingEvents.map((event, index) => (
                <Card 
                  key={event.id} 
                  className="hover-scale border-border/50 hover:border-accent/50 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={event.isPremium ? "default" : "secondary"} className="mb-2">
                        {event.isPremium ? "Premium" : "Free"}
                      </Badge>
                      <Badge variant="outline">{event.type}</Badge>
                    </div>
                    <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                    <CardDescription className="text-sm">
                      Led by {event.instructor}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{event.attendees} registered</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 bg-accent hover:bg-accent/90">
                        Register Now
                      </Button>
                      <Button variant="outline" size="icon">
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-8 text-foreground">Past Events & Recordings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pastEvents.map((event) => (
                <Card key={event.id} className="hover-scale border-border/50 hover:border-accent/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>{event.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Video className="w-4 h-4 mr-2" />
                      Watch Recording
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">&copy; 2025 Genlink Hub. Linking Generations. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Events;