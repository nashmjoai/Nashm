import os
from PIL import Image, ImageDraw, ImageFont

scratch_dir = r"c:\Users\abdel\Desktop\nashmai\scratch"
os.makedirs(scratch_dir, exist_ok=True)

# Color Palette
PRIMARY = (196, 30, 58)       # Jordanian Crimson #C41E3A
DARK = (30, 41, 59)           # Deep Slate #1E293B
SLATE_LIGHT = (241, 245, 249) # #F1F5F9
BORDER = (203, 213, 225)      # #CBD5E1
WHITE = (255, 255, 255)
ACCENT = (217, 119, 6)        # Amber #D97706
SUCCESS = (16, 185, 129)      # Emerald #10B981
TEXT_MUTED = (100, 116, 139)  # #64748B

def create_system_topology_diagram():
    w, h = 1200, 700
    img = Image.new("RGB", (w, h), (248, 250, 252))
    draw = ImageDraw.Draw(img)
    
    # Title Banner
    draw.rectangle([0, 0, w, 60], fill=DARK)
    draw.text((30, 18), "NASHM AI — Full System Architecture Topology", fill=WHITE)
    draw.rectangle([0, 56, w, 60], fill=PRIMARY)
    
    # Layer 1: Client SPA
    draw.rounded_rectangle([40, 90, 1160, 210], radius=10, fill=WHITE, outline=BORDER, width=2)
    draw.text((60, 105), "CLIENT LAYER (Vite / React 18 / Tailwind CSS / Radix UI)", fill=PRIMARY)
    
    # Client Sub-boxes
    boxes_client = [
        ("Chat Interface (SSE Stream)", 60, 140, 310, 195, SLATE_LIGHT),
        ("Side Panels (Agents, Cal, MCP)", 330, 140, 580, 195, SLATE_LIGHT),
        ("Artifacts Sandbox (Sandpack)", 600, 140, 850, 195, SLATE_LIGHT),
        ("State (Jotai / TanStack Query)", 870, 140, 1140, 195, SLATE_LIGHT),
    ]
    for text, x1, y1, x2, y2, bg in boxes_client:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=6, fill=bg, outline=BORDER, width=1)
        draw.text((x1 + 10, y1 + 18), text, fill=DARK)
        
    # Layer 2: API & Core Engine
    draw.rounded_rectangle([40, 240, 1160, 420], radius=10, fill=WHITE, outline=PRIMARY, width=2)
    draw.text((60, 255), "CORE ENGINE & BACKEND (Node.js / Express 5 / TypeScript Engine)", fill=PRIMARY)
    
    engine_boxes = [
        ("Multi-Endpoint SSE Router", 60, 290, 310, 350, (254, 242, 242)),
        ("MCP Protocol Manager", 330, 290, 580, 350, (254, 242, 242)),
        ("Vector RAG & File Parsing", 600, 290, 850, 350, (254, 242, 242)),
        ("Calendar AI Scheduler", 870, 290, 1140, 350, (254, 242, 242)),
        ("E2EE Cryptographic Engine", 60, 360, 310, 405, SLATE_LIGHT),
        ("Piston Sandbox Adapter", 330, 360, 580, 405, SLATE_LIGHT),
        ("Long-Term Memory Engine", 600, 360, 850, 405, SLATE_LIGHT),
        ("Token Accounting & Billing", 870, 360, 1140, 405, SLATE_LIGHT),
    ]
    for text, x1, y1, x2, y2, bg in engine_boxes:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=6, fill=bg, outline=BORDER, width=1)
        draw.text((x1 + 12, y1 + 12), text, fill=DARK)

    # Layer 3: Persistence & External AI
    draw.rounded_rectangle([40, 450, 580, 660], radius=10, fill=WHITE, outline=BORDER, width=2)
    draw.text((60, 465), "DATABASE & CACHE LAYER", fill=DARK)
    db_boxes = [
        ("MongoDB Database (Mongoose Schemas)", 60, 500, 560, 540, SLATE_LIGHT),
        ("Redis (Sessions, Cache & Rate Limiting)", 60, 550, 560, 590, SLATE_LIGHT),
        ("MeiliSearch (Instant Sub-millisecond Search)", 60, 600, 560, 640, SLATE_LIGHT),
    ]
    for text, x1, y1, x2, y2, bg in db_boxes:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=6, fill=bg, outline=BORDER, width=1)
        draw.text((x1 + 15, y1 + 10), text, fill=DARK)

    draw.rounded_rectangle([620, 450, 1160, 660], radius=10, fill=WHITE, outline=BORDER, width=2)
    draw.text((640, 465), "AI PROVIDERS & EXECUTION RUNTIMES", fill=DARK)
    ext_boxes = [
        ("LLM APIs: OpenAI, Claude 3.7, Gemini 2.0, DeepSeek R1", 640, 500, 1140, 540, (239, 246, 255)),
        ("Local Inference: Ollama Engine (Self-Hosted)", 640, 550, 1140, 590, (239, 246, 255)),
        ("Sandboxes: Piston Code Execution, SearXNG Search", 640, 600, 1140, 640, (239, 246, 255)),
    ]
    for text, x1, y1, x2, y2, bg in ext_boxes:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=6, fill=bg, outline=BORDER, width=1)
        draw.text((x1 + 15, y1 + 10), text, fill=DARK)

    out_path = os.path.join(scratch_dir, "diag_system_topology.png")
    img.save(out_path, "PNG", dpi=(300, 300))
    print(f"Saved: {out_path}")

def create_rag_pipeline_diagram():
    w, h = 1100, 360
    img = Image.new("RGB", (w, h), (248, 250, 252))
    draw = ImageDraw.Draw(img)
    
    # Title
    draw.rectangle([0, 0, w, 45], fill=DARK)
    draw.text((25, 12), "NASHM AI — High-Performance File Search & Vector RAG Pipeline", fill=WHITE)
    draw.rectangle([0, 42, w, 45], fill=PRIMARY)
    
    steps = [
        ("1. Ingestion", "Uploads (PDF, DOCX, XLSX, Code)\nProcessed via multer & Sharp", 30, 80, 220, 310, (254, 242, 242)),
        ("2. Extraction", "pdfjs-dist / mammoth / xlsx\nStructured text stripping", 245, 80, 435, 310, (255, 251, 235)),
        ("3. Chunking & Vectors", "Sliding window text chunks\nHigh-dim embeddings", 460, 80, 650, 310, (239, 246, 255)),
        ("4. Retrieval", "Cosine similarity ranking\nSub-second top-K query", 675, 80, 865, 310, (236, 253, 245)),
        ("5. LLM Prompting", "Clean markdown citations\nZero hallucination response", 890, 80, 1070, 310, (245, 243, 255)),
    ]
    
    for title, desc, x1, y1, x2, y2, bg in steps:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=8, fill=bg, outline=PRIMARY if "1" in title or "5" in title else BORDER, width=2 if "1" in title or "5" in title else 1)
        draw.text((x1 + 12, y1 + 15), title, fill=PRIMARY if "1" in title or "5" in title else DARK)
        draw.line([x1 + 10, y1 + 45, x2 - 10, y1 + 45], fill=BORDER, width=1)
        
        # Multiline desc
        lines = desc.split("\n")
        curr_y = y1 + 65
        for line in lines:
            draw.text((x1 + 12, curr_y), line, fill=DARK)
            curr_y += 28

        # Draw arrow to next step if not last
        if x2 < 1000:
            arrow_x = x2 + 3
            arrow_y = (y1 + y2) // 2
            draw.polygon([(arrow_x, arrow_y - 6), (arrow_x + 8, arrow_y), (arrow_x, arrow_y + 6)], fill=PRIMARY)

    out_path = os.path.join(scratch_dir, "diag_rag_pipeline.png")
    img.save(out_path, "PNG", dpi=(300, 300))
    print(f"Saved: {out_path}")

def create_calendar_action_diagram():
    w, h = 1100, 380
    img = Image.new("RGB", (w, h), (248, 250, 252))
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([0, 0, w, 45], fill=DARK)
    draw.text((25, 12), "NASHM AI — Autonomous Calendar Action Scheduler State Machine", fill=WHITE)
    draw.rectangle([0, 42, w, 45], fill=PRIMARY)
    
    # State boxes
    states = [
        ("Pending (⏳)", "Event created with agentId\nand actionPrompt. Scheduled.", 40, 100, 260, 240, (255, 251, 235), ACCENT),
        ("Running (⚡)", "Cron trigger matches startDate.\nAgent executes tools & RAG.", 320, 100, 540, 240, (239, 246, 255), (37, 99, 235)),
        ("Completed (✅)", "Task output saved in\nexecutionResult field.", 600, 100, 820, 240, (236, 253, 245), SUCCESS),
        ("Failed (❌)", "Error caught, logged,\nand stored with retry rule.", 880, 100, 1060, 240, (254, 242, 242), PRIMARY),
    ]
    
    for title, desc, x1, y1, x2, y2, bg, border_col in states:
        draw.rounded_rectangle([x1, y1, x2, y2], radius=8, fill=bg, outline=border_col, width=2)
        draw.text((x1 + 15, y1 + 15), title, fill=border_col)
        draw.line([x1 + 10, y1 + 45, x2 - 10, y1 + 45], fill=BORDER, width=1)
        
        lines = desc.split("\n")
        curr_y = y1 + 60
        for line in lines:
            draw.text((x1 + 15, curr_y), line, fill=DARK)
            curr_y += 26
            
    # Bottom recurrence banner
    draw.rounded_rectangle([40, 270, 1060, 350], radius=8, fill=WHITE, outline=BORDER, width=1)
    draw.text((60, 285), "🔁 Recurrence Engine: Supports None, Daily, Weekly, and Monthly cycles with automatic tenant isolation", fill=DARK)
    draw.text((60, 315), "🎨 Jordanian Royal Palette: Automated Events tagged with #C41E3A for instant high-priority recognition", fill=PRIMARY)

    out_path = os.path.join(scratch_dir, "diag_calendar_scheduler.png")
    img.save(out_path, "PNG", dpi=(300, 300))
    print(f"Saved: {out_path}")

def create_mcp_architecture_diagram():
    w, h = 1100, 380
    img = Image.new("RGB", (w, h), (248, 250, 252))
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([0, 0, w, 45], fill=DARK)
    draw.text((25, 12), "NASHM AI — Model Context Protocol (MCP) Integration Framework", fill=WHITE)
    draw.rectangle([0, 42, w, 45], fill=PRIMARY)
    
    # Left: LLM
    draw.rounded_rectangle([40, 80, 260, 340], radius=8, fill=WHITE, outline=PRIMARY, width=2)
    draw.text((60, 100), "LLM Inference", fill=PRIMARY)
    draw.text((60, 140), "• Claude 3.7 Sonnet\n• GPT-4o\n• Gemini 2.0 Pro\n• DeepSeek R1", fill=DARK)
    draw.text((60, 260), "Emits tool_calls\nvia JSON Schema", fill=TEXT_MUTED)
    
    # Center: Nashm Core
    draw.rounded_rectangle([320, 80, 720, 340], radius=8, fill=(254, 242, 242), outline=PRIMARY, width=2)
    draw.text((340, 100), "Nashm Core MCP Manager (UserConnectionManager)", fill=PRIMARY)
    draw.rounded_rectangle([340, 140, 700, 210], radius=6, fill=WHITE, outline=BORDER, width=1)
    draw.text((355, 155), "Stdio Transport Adapter (Local OS Processes)", fill=DARK)
    draw.text((355, 180), "Spawns child processes: Python, Node, CLI binaries", fill=TEXT_MUTED)
    
    draw.rounded_rectangle([340, 230, 700, 300], radius=6, fill=WHITE, outline=BORDER, width=1)
    draw.text((355, 245), "SSE Transport Adapter (Remote HTTP/SSE)", fill=DARK)
    draw.text((355, 270), "Connects to remote web MCP endpoints & microservices", fill=TEXT_MUTED)
    
    # Right: External Environments
    draw.rounded_rectangle([780, 80, 1060, 340], radius=8, fill=WHITE, outline=BORDER, width=2)
    draw.text((800, 100), "Target Environments", fill=DARK)
    draw.text((800, 140), "• Enterprise SQL / Mongo\n• Local File System\n• GitHub / GitLab Repos\n• Internal REST APIs\n• Custom Enterprise Tools", fill=DARK)
    draw.text((800, 280), "Executes JSON-RPC 2.0", fill=SUCCESS)
    
    out_path = os.path.join(scratch_dir, "diag_mcp_framework.png")
    img.save(out_path, "PNG", dpi=(300, 300))
    print(f"Saved: {out_path}")

if __name__ == "__main__":
    create_system_topology_diagram()
    create_rag_pipeline_diagram()
    create_calendar_action_diagram()
    create_mcp_architecture_diagram()
