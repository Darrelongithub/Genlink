import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Code, Play, RotateCcw, CheckCircle2, Terminal, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeSandboxProps {
  title: string;
  description: string;
  initialCode: string;
  expectedOutput?: string;
  hints?: string[];
  language: "python" | "javascript";
  xpReward: number;
  onComplete: (score: number) => void;
}

const CodeSandbox = ({
  title,
  description,
  initialCode,
  expectedOutput,
  hints = [],
  language,
  xpReward,
  onComplete,
}: CodeSandboxProps) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Simulate code execution (in real implementation, this would use a backend)
  const runCode = async () => {
    setIsRunning(true);
    setOutput("");

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Simple simulation for demo - in production, use actual sandbox API
      let result = "";
      
      if (language === "javascript") {
        // Basic JavaScript evaluation for safe operations
        if (code.includes("console.log")) {
          const logs: string[] = [];
          const mockConsole = {
            log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
          };
          
          try {
            // Very limited eval for demo purposes
            const safeCode = code.replace(/console\.log/g, "mockConsole.log");
            const fn = new Function("mockConsole", safeCode);
            fn(mockConsole);
            result = logs.join("\n");
          } catch (e: any) {
            result = `Error: ${e.message}`;
          }
        } else {
          result = "Hint: Use console.log() to display output";
        }
      } else if (language === "python") {
        // Python simulation - would need actual backend
        if (code.includes("print")) {
          // Extract what's being printed for demo
          const printMatch = code.match(/print\((.*)\)/);
          if (printMatch) {
            result = `[Simulated Python Output]\n${printMatch[1].replace(/["']/g, "")}`;
          }
        } else {
          result = "Hint: Use print() to display output";
        }
      }

      setOutput(result || "Code executed successfully (no output)");

      // Check if output matches expected
      if (expectedOutput && result.includes(expectedOutput)) {
        setIsComplete(true);
        onComplete(100);
      }
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    }

    setIsRunning(false);
  };

  const handleReset = () => {
    setCode(initialCode);
    setOutput("");
    setIsComplete(false);
    setShowHints(false);
    setCurrentHint(0);
  };

  const handleShowHint = () => {
    setShowHints(true);
    if (currentHint < hints.length - 1) {
      setCurrentHint(prev => prev + 1);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-accent" />
              {title}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase text-xs">
              {language}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-accent" />
              +{xpReward} XP
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Code editor */}
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 bg-muted px-3 py-2 rounded-t-lg flex items-center gap-2 border-b">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {language === "python" ? "main.py" : "script.js"}
            </span>
          </div>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm min-h-[200px] pt-12 bg-muted/30 resize-none"
            placeholder="Write your code here..."
            disabled={isComplete}
          />
        </div>

        {/* Output console */}
        <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg min-h-[100px]">
          <div className="flex items-center gap-2 text-gray-400 mb-2 text-xs">
            <Terminal className="w-3 h-3" />
            Output
          </div>
          {isRunning ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Running...
            </div>
          ) : output ? (
            <pre className="whitespace-pre-wrap">{output}</pre>
          ) : (
            <span className="text-gray-500">Click "Run Code" to see output</span>
          )}
        </div>

        {/* Expected output hint */}
        {expectedOutput && !isComplete && (
          <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Expected output should contain: <code className="bg-muted px-1 rounded">{expectedOutput}</code>
            </span>
          </div>
        )}

        {/* Hints section */}
        {showHints && hints.length > 0 && (
          <div className="p-4 bg-premium/10 border border-premium/30 rounded-lg">
            <div className="flex items-center gap-2 text-premium mb-2">
              <Lightbulb className="w-4 h-4" />
              <span className="font-medium">Hint {currentHint + 1}</span>
            </div>
            <p className="text-sm text-muted-foreground">{hints[currentHint]}</p>
          </div>
        )}

        {/* Success message */}
        {isComplete && (
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-accent" />
              <div>
                <p className="font-semibold text-foreground">Challenge Complete! 🎉</p>
                <p className="text-sm text-muted-foreground">Your code produced the expected output</p>
              </div>
            </div>
            <Badge className="bg-accent text-accent-foreground">
              +{xpReward} XP Earned!
            </Badge>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={runCode} 
            disabled={isRunning || isComplete}
            className="flex-1 bg-accent hover:bg-accent/90"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? "Running..." : "Run Code"}
          </Button>
          {hints.length > 0 && !isComplete && (
            <Button 
              onClick={handleShowHint} 
              variant="outline"
              disabled={showHints && currentHint >= hints.length - 1}
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Hint
            </Button>
          )}
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeSandbox;
