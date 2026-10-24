import { Download, FileText, Video, Headphones, Lock, BookOpen } from "lucide-react";
import StickyNav from "@/components/StickyNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Resources = () => {
  const resources = {
    tools: [
      {
        id: 1,
        title: "Forex Trading Simulator",
        description: "Practice trading strategies without financial risk",
        type: "Interactive Tool",
        isPremium: true,
        icon: FileText,
      },
      {
        id: 2,
        title: "Financial Planning Templates",
        description: "Excel templates for budgeting and wealth tracking",
        type: "Spreadsheet",
        isPremium: false,
        icon: FileText,
      },
      {
        id: 3,
        title: "eBook Publishing Toolkit",
        description: "Complete guide and templates for self-publishing",
        type: "Toolkit",
        isPremium: true,
        icon: BookOpen,
      },
      {
        id: 4,
        title: "Marketing Cheat Sheets",
        description: "Quick-reference guides for digital marketing strategies",
        type: "PDF Guide",
        isPremium: false,
        icon: FileText,
      },
    ],
    videos: [
      {
        id: 5,
        title: "Spiritual Wealth Meditation Series",
        description: "10-part guided meditation for abundance mindset",
        duration: "2h 30m",
        isPremium: false,
        icon: Video,
      },
      {
        id: 6,
        title: "Forex Market Analysis Masterclass",
        description: "Deep dive into technical and fundamental analysis",
        duration: "5h 15m",
        isPremium: true,
        icon: Video,
      },
      {
        id: 7,
        title: "Python for Data Science Bootcamp",
        description: "Comprehensive video series on Python programming",
        duration: "8h 45m",
        isPremium: true,
        icon: Video,
      },
    ],
    podcasts: [
      {
        id: 8,
        title: "Generational Wealth Conversations",
        description: "Interviews with successful entrepreneurs and investors",
        episodes: 24,
        isPremium: false,
        icon: Headphones,
      },
      {
        id: 9,
        title: "Tech Career Breakthrough Stories",
        description: "Real stories from ICT professionals in Africa",
        episodes: 18,
        isPremium: false,
        icon: Headphones,
      },
    ],
  };

  const ResourceCard = ({ resource }: { resource: any }) => {
    const Icon = resource.icon;
    return (
      <Card className="hover-scale border-border/50 hover:border-accent/50 transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="p-3 rounded-lg bg-accent/10">
              <Icon className="w-6 h-6 text-accent" />
            </div>
            {resource.isPremium ? (
              <Badge className="bg-premium text-premium-foreground">
                <Lock className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
          <CardTitle className="text-lg">{resource.title}</CardTitle>
          <CardDescription>{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {resource.type || resource.duration || `${resource.episodes} episodes`}
            </span>
            <Button size="sm" className="bg-accent hover:bg-accent/90">
              <Download className="w-4 h-4 mr-2" />
              {resource.isPremium ? "Unlock" : "Download"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Exclusive Resources Library
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Access a treasure trove of tools, templates, videos, and expert insights designed to accelerate 
              your spiritual growth, financial mastery, and technical excellence.
            </p>
          </div>

          <Tabs defaultValue="tools" className="space-y-8">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="tools">Tools & Templates</TabsTrigger>
              <TabsTrigger value="videos">Video Lessons</TabsTrigger>
              <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
            </TabsList>

            <TabsContent value="tools" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.tools.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ResourceCard resource={resource} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="videos" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.videos.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ResourceCard resource={resource} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="podcasts" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.podcasts.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ResourceCard resource={resource} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <Card className="mt-16 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Unlock Premium Resources</CardTitle>
              <CardDescription className="text-base">
                Get unlimited access to all premium tools, masterclasses, and exclusive content
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="bg-premium hover:bg-premium/90 text-premium-foreground">
                Upgrade to Premium
              </Button>
            </CardContent>
          </Card>
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

export default Resources;