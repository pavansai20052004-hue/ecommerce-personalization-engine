# Demo Recording Guide  
  
Record a 2-3 min screen recording. Walk through 3 scenarios,  
then use the live simulator to add/remove events in real time.  
  
## Scenes  
1. Cold Start - npm run dev, open localhost:3000, show Ollama status  
2. Preset Scenarios - Load Discount Hunter, Cart Abandoner, Loyal Customer  
3. Live Simulator - Add checkout_complete to shift classification  
4. LLM Toggle - Show On vs Off nudge quality  
  
## Key Points  
- Two-layer: rules engine + LLM  
- Evidence-based: every score is explained  
- Real-time: 300ms debounce  
- Graceful degradation: works without Ollama  
