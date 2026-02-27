/**
 * Curated conference talk best practices content for RAG knowledge base.
 * Covers structure, pacing, hooks, audience engagement, and closing techniques.
 */
export const BEST_PRACTICES_CONTENT = `# Conference Talk Best Practices

## Talk Structure Patterns

### Problem-Solution-Demo
Start with a real-world pain point the audience recognizes. Present your solution architecture clearly with diagrams or code. Then demonstrate it live or with a recorded walkthrough. This structure builds credibility through proof. Best for technical audiences who value evidence over theory. Allocate roughly 20% problem framing, 40% solution, 40% demonstration.

### Story Arc
Take the audience on a narrative journey. Set up context with a relatable scenario, build tension through challenges encountered, reach a climax with your key insight or breakthrough, and resolve with practical takeaways. This approach engages emotionally and maintains attention through curiosity. Works especially well for experience reports and lessons-learned talks.

### Hot Take / Controversial Claim
Open with a bold, provocative statement that challenges conventional wisdom. Then systematically build evidence supporting your position. Address counterarguments honestly. Close with a nuanced conclusion that acknowledges complexity. This structure creates immediate engagement through cognitive dissonance. Best for experienced speakers who can handle audience pushback gracefully.

### Workshop / Interactive Style
Teach concepts through hands-on exercises and live coding. Alternate between brief explanations (2-3 minutes) and audience activities (3-5 minutes). Provide clear setup instructions before each exercise. This format maximizes learning retention but requires careful time management and fallback plans for technical difficulties.

### Comparison Framework
Evaluate multiple approaches against explicit criteria. Present each option fairly before revealing your recommendation. Use tables, matrices, or side-by-side demos. This works well for technology selection talks and architectural decision presentations. Audience appreciates the systematic analysis approach.

## Opening Hook Techniques

### The Surprising Statistic
Lead with a data point that challenges assumptions. "78% of microservices migrations fail in the first year." Pause for effect. The number must be real, sourced, and genuinely surprising. Follow immediately with "Here's why, and here's what the 22% do differently."

### The Provocative Question
Ask something the audience cannot answer confidently. "How many of you know your service's p99 latency right now?" This creates an information gap the talk promises to fill. Avoid questions with obvious answers — the gap must feel real.

### The Brief Personal Anecdote
Share a 30-second story from your experience that encapsulates the talk's theme. "Last Tuesday at 3am, I got paged for the fifth time that week. That's when I realized our monitoring wasn't broken — our architecture was." Stories create emotional connection and establish credibility simultaneously.

### The Live Demo Hook
Start by showing the end result before explaining how you got there. "Watch this. [Demo runs.] That just processed 10,000 events in under 200ms. By the end of this talk, you'll know exactly how to build this." The demonstration creates desire to understand the mechanism.

### The Bold Claim
Make a strong assertion that the talk will defend. "You don't need Kubernetes. There, I said it." This immediately creates stakes — the audience stays to see if you can back it up. Only use claims you can genuinely support with evidence.

## Audience Engagement Techniques

### Strategic Questions
Place questions at transition points between sections. Use rhetorical questions to guide thinking ("What would happen if we removed that layer?") and direct questions to gauge understanding ("Show of hands — who's dealt with this?"). Limit to 3-4 questions per 30-minute talk to avoid interruption fatigue.

### Think-Pair-Share
Give the audience 30 seconds to consider a problem, then 60 seconds to discuss with a neighbor, then ask 2-3 pairs to share. This technique works in talks of 25+ minutes and dramatically increases engagement and retention. Place it after presenting a key concept that benefits from discussion.

### Live Polling
Use tools like Slido or Mentimeter for real-time polls. Best for gauging audience experience level early in the talk, or for choosing between demo paths mid-talk. Keep polls to yes/no or 3-4 options maximum. Display results immediately and react to them.

### Call and Response
Establish a pattern early. "Every time I say 'observability,' you say 'is not just logging.'" This creates energy and reinforces key messages through repetition. Use sparingly — once or twice per talk maximum.

### Pause for Reflection
After delivering a key insight, pause for 3-5 seconds of silence. Say "Let that sink in for a moment." The silence amplifies the message and gives the audience time to process. Most speakers rush past their best moments — pausing is a superpower.

## Pacing and Timing Strategies

### Word-Per-Minute Targets
Aim for 130-150 words per minute for technical content with slides. Slow to 100-120 WPM for complex code walkthroughs. Speed up to 160-170 WPM for narrative storytelling sections. Practice with a timer to calibrate your natural pace.

### Energy Curve Management
Start with high energy to capture attention (first 2 minutes). Settle into a moderate, sustainable pace for the body (middle 60%). Build energy again approaching the climax or key insight. End on a high note with your call to action. Avoid monotone delivery — vary pace, volume, and intensity.

### Strategic Pauses
Use 2-3 second pauses before key points ("The real problem is..." [pause] "...we're optimizing for the wrong metric."). Use 5-second pauses after key points to let them land. Mark pauses in your script with [PAUSE] markers so you don't skip them under pressure.

### Section Transition Timing
Allocate format-appropriate time per section. For a 30-minute talk: Introduction 3-4 minutes, main sections 6-8 minutes each, conclusion 3-4 minutes. For a 10-minute lightning talk: Hook 1 minute, single core message 7 minutes, call to action 2 minutes. Always build in 2-3 minutes of buffer for the unexpected.

### The 10-20-30 Guideline
For standard talks: no more than 10 major concepts, presented in 20-30 minutes, with no more than 30 words per slide. This prevents cognitive overload. Each concept should be a discrete, memorable unit that stands on its own.

## Closing and Call to Action

### The Callback Close
Reference your opening hook in the conclusion. If you opened with a problem, show how the audience can now solve it. If you opened with a question, answer it. This creates narrative satisfaction and a sense of completeness.

### The Three Takeaways
Explicitly state your three key takeaways, numbered. "If you remember nothing else: one, start with observability before you scale. Two, test your failure modes in production. Three, your on-call rotation is a design decision." Numbered lists are memorable and shareable.

### The Next Step
Give the audience one specific action they can take immediately. "Open your laptop after this talk and add one health check endpoint to your most critical service." Specificity drives action — vague calls to action are ignored.

### Resource Sharing
End with a QR code or short URL to your slides, code repository, and recommended reading. Include your social media handle for follow-up questions. Make the resources genuinely useful, not just a link dump.

### The Memorable Closing Line
Craft a final sentence that encapsulates your message. Rehearse it until it feels natural. "The best architecture is the one your team can operate at 3am." End on this line and stop talking. Resist the urge to add "So, yeah, that's it" — the strong close deserves silence.
`;

export const BEST_PRACTICES_INDEX_NAME = 'best_practices';
export const EMBEDDING_DIMENSION = 1536;
