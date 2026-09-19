import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    """Sets background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets inner padding for a table cell in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_left_border(cell, color_hex="C41E3A", sz="36"):
    """Sets a heavy left border on a cell for callout boxes."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

def add_callout(doc, title, text, color_hex="C41E3A", fill_hex="F8FAFC"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, fill_hex)
    set_cell_left_border(cell, color_hex=color_hex, sz="32")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    run_t = p.add_run(f"📌 {title}\n")
    run_t.bold = True
    run_t.font.name = "Arial"
    run_t.font.size = Pt(10.5)
    run_t.font.color.rgb = RGBColor(196, 30, 58) if color_hex == "C41E3A" else RGBColor(30, 41, 59)
    
    run_b = p.add_run(text)
    run_b.font.name = "Calibri"
    run_b.font.size = Pt(10.0)
    run_b.font.color.rgb = RGBColor(51, 65, 85)
    
    # Add spacing after callout
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(6)

def format_table(table, col_widths, headers, data):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    # Style Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "C41E3A") # Jordanian Crimson
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(title)
        run.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor(255, 255, 255)
        
    # Data Rows
    for r_idx, row_data in enumerate(data):
        row_cells = table.add_row().cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].width = col_widths[c_idx]
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=120, right=120)
            p = row_cells[c_idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(val)
            run.font.name = "Calibri"
            run.font.size = Pt(9.5)
            if c_idx == 0:
                run.bold = True
                run.font.color.rgb = RGBColor(196, 30, 58)
            else:
                run.font.color.rgb = RGBColor(30, 41, 59)

def main():
    doc = Document()
    
    # Page setup - 1 inch margins
    for sec in doc.sections:
        sec.top_margin = Inches(1.0)
        sec.bottom_margin = Inches(1.0)
        sec.left_margin = Inches(1.0)
        sec.right_margin = Inches(1.0)
        sec.different_first_page_header_footer = True
        
        # Header for regular pages
        header = sec.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("NASHM AI (نشمي AI) — Enterprise Technical Specification Report | Jordanian & Arabic Flagship")
        hrun.font.name = "Arial"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(148, 163, 184)
        
        # Footer for regular pages
        footer = sec.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("NASHM AI © 2026 — Sovereign Generative AI Platform | Hashemite Kingdom of Jordan")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)

    # -------------------------------------------------------------
    # COVER PAGE / TITLE SECTION
    # -------------------------------------------------------------
    logo_path = r"c:\Users\abdel\Desktop\nashmai\client\public\assets\logo.png"
    if not os.path.exists(logo_path):
        logo_path = r"c:\Users\abdel\Desktop\nashmai\logo_transparent.png"
        
    p_logo = doc.add_paragraph()
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_logo.paragraph_format.space_before = Pt(20)
    p_logo.paragraph_format.space_after = Pt(15)
    if os.path.exists(logo_path):
        try:
            p_logo.add_run().add_picture(logo_path, width=Inches(2.2))
        except Exception as e:
            print("Logo add exception:", e)

    p_flag = doc.add_paragraph()
    p_flag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_flag.paragraph_format.space_after = Pt(5)
    r_flag = p_flag.add_run("🇯🇴 THE PREMIER JORDANIAN & ARABIC ARTIFICIAL INTELLIGENCE PLATFORM 🇯🇴")
    r_flag.font.name = "Arial"
    r_flag.font.size = Pt(10)
    r_flag.bold = True
    r_flag.font.color.rgb = RGBColor(196, 30, 58)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(5)
    p_title.paragraph_format.space_after = Pt(5)
    r_title = p_title.add_run("NASHM AI (نشمي AI)")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(28)
    r_title.bold = True
    r_title.font.color.rgb = RGBColor(30, 41, 59)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(20)
    r_sub = p_sub.add_run("Comprehensive Technical & Architectural Specification Report\nFull Feature Deep-Dive, Autonomous Agents, Model Context Protocol & System Topology")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    # Decorative Divider Line
    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_div.paragraph_format.space_after = Pt(20)
    r_div = p_div.add_run("―" * 45)
    r_div.font.color.rgb = RGBColor(196, 30, 58)
    r_div.bold = True

    # Metadata Box Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_widths = [Inches(2.5), Inches(4.0)]
    meta_data = [
        ("Platform Name & Edition", "NASHM AI (نشمي AI) — Enterprise 2026 Edition"),
        ("Origin & Sovereign Identity", "Hashemite Kingdom of Jordan (Amman / Middle East Hub)"),
        ("Engineering Architecture", "TypeScript Monorepo / React 18 / Express 5 / MongoDB / Redis / MCP"),
        ("Author & Organization", "Nashm AI Core Architecture, Systems & AI Engineering Group"),
    ]
    for row_idx, (k, v) in enumerate(meta_data):
        row_cells = meta_table.rows[row_idx].cells
        for col_idx, (w, val) in enumerate(zip(meta_widths, (k, v))):
            row_cells[col_idx].width = w
            set_cell_background(row_cells[col_idx], "F1F5F9" if col_idx == 0 else "FFFFFF")
            set_cell_margins(row_cells[col_idx], top=60, bottom=60, left=100, right=100)
            p = row_cells[col_idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(val)
            run.font.name = "Calibri"
            run.font.size = Pt(10)
            if col_idx == 0:
                run.bold = True
                run.font.color.rgb = RGBColor(30, 41, 59)
            else:
                run.font.color.rgb = RGBColor(196, 30, 58) if row_idx == 1 else RGBColor(51, 65, 85)

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECTION 0: EXECUTIVE SUMMARY & NATIONAL IDENTITY
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. Executive Summary & Platform Identity")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p_exec1 = doc.add_paragraph()
    p_exec1.paragraph_format.line_spacing = 1.15
    p_exec1.paragraph_format.space_after = Pt(8)
    r = p_exec1.add_run(
        "NASHM AI (نشمي AI) stands as the premier Jordanian and Arabic sovereign artificial intelligence platform, "
        "engineered from the ground up to deliver enterprise-grade generative AI capabilities, autonomous multi-agent orchestration, "
        "and seamless computational tool integration. Built by Arab engineers in Jordan, Nashm AI combines modern full-stack web technologies "
        "with cutting-edge language model infrastructures to empower government institutions, corporations, developers, and researchers across the MENA region."
    )
    r.font.name = "Calibri"
    r.font.size = Pt(10.5)

    p_exec2 = doc.add_paragraph()
    p_exec2.paragraph_format.line_spacing = 1.15
    p_exec2.paragraph_format.space_after = Pt(8)
    r = p_exec2.add_run(
        "The architecture is organized as a high-performance Monorepo orchestrated via Turborepo, featuring an ultra-responsive React 18 "
        "Single Page Application (SPA), a modern TypeScript backend engine, multi-endpoint Server-Sent Events (SSE) streaming router, "
        "Model Context Protocol (MCP) tool integration, sandboxed code execution runtime, and dual-layer database persistence (MongoDB, Redis, and MeiliSearch)."
    )
    r.font.name = "Calibri"
    r.font.size = Pt(10.5)

    add_callout(
        doc,
        "National AI Sovereignty & Technical Independence",
        "Nashm AI provides native Arabic tokenization optimization, culturally attuned reasoning, robust privacy compliance, "
        "and complete independence through hybrid cloud and on-premises deployment capabilities, proudly representing Jordanian technological leadership in the global AI landscape.",
        color_hex="C41E3A",
        fill_hex="F8FAFC"
    )

    # Insert System Topology Diagram
    diag_topo = r"c:\Users\abdel\Desktop\nashmai\scratch\diag_system_topology.png"
    if os.path.exists(diag_topo):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        p_img.add_run().add_picture(diag_topo, width=Inches(6.3))
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(12)
        r_cap = p_cap.add_run("Figure 1: NASHM AI End-to-End System Topology & Service Orchestration")
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9)
        r_cap.italic = True
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    # -------------------------------------------------------------
    # SECTION 2: CORE INTERACTIVE TOOLS & CAPABILITIES
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("2. Core AI Tools & Interactive Capabilities")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    # 2.1 File Search
    h2 = doc.add_heading(level=2)
    r_h2 = h2.add_run("2.1 File Search & Vector RAG (Retrieval-Augmented Generation)")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(13)
    r_h2.bold = True
    r_h2.font.color.rgb = RGBColor(30, 41, 59)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The File Search module enables intelligent, zero-hallucination document synthesis across hundreds of pages of complex documents. "
        "When files (PDF, DOCX, XLSX, CSV, Code) are attached to a conversation or agent, Nashm AI executes an automated 5-stage pipeline:"
    ).font.size = Pt(10.5)

    p_list = doc.add_paragraph()
    p_list.paragraph_format.line_spacing = 1.15
    p_list.paragraph_format.space_after = Pt(6)
    p_list.add_run(
        "1. Document Ingestion & Extraction: Multi-format parsing using pdfjs-dist, mammoth, and SheetJS (xlsx) to convert unstructured binary streams into structured text.\n"
        "2. Semantic Chunking: Text is segmented into overlapping windows (e.g., 500-1000 tokens) preserving semantic continuity and header hierarchies.\n"
        "3. Vector Embeddings: Text chunks are vectorized into high-dimensional embeddings and indexed in high-speed vector stores.\n"
        "4. Cosine Similarity Matching: User queries are embedded in real-time and matched against document chunks via sub-millisecond similarity scoring.\n"
        "5. Prompt Context Injection: The top-K most relevant chunks are dynamically injected into the model's system context, generating answers backed by verifiable citations."
    ).font.size = Pt(10)

    # RAG Pipeline Diagram
    diag_rag = r"c:\Users\abdel\Desktop\nashmai\scratch\diag_rag_pipeline.png"
    if os.path.exists(diag_rag):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(4)
        p_img.add_run().add_picture(diag_rag, width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(10)
        r_cap = p_cap.add_run("Figure 2: NASHM AI Vector RAG Document Extraction & Retrieval Flow")
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9)
        r_cap.italic = True
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    # 2.2 Web Search
    h2 = doc.add_heading(level=2)
    r_h2 = h2.add_run("2.2 Live Web Search Engine")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(13)
    r_h2.bold = True
    r_h2.font.color.rgb = RGBColor(30, 41, 59)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Nashm AI overcomes model training knowledge cutoffs through an integrated Web Search pipeline. "
        "The system natively interfaces with private self-hosted SearXNG meta-search instances, Google Search APIs, Tavily Search, "
        "and Traversaal. The model autonomously invokes the web search tool, analyzes real-time web pages, strips HTML noise, and delivers "
        "grounded, fact-based answers with verified clickable markdown citations and sources."
    ).font.size = Pt(10.5)

    # 2.3 Generate Image
    h2 = doc.add_heading(level=2)
    r_h2 = h2.add_run("2.3 Generative Image Studio")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(13)
    r_h2.bold = True
    r_h2.font.color.rgb = RGBColor(30, 41, 59)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The generative image module transforms natural language prompts into stunning visual assets, photorealistic photography, UI wireframes, "
        "and artistic illustrations. The platform integrates industry-leading diffusion and transformer imaging backends:"
    ).font.size = Pt(10.5)

    p_img_models = doc.add_paragraph()
    p_img_models.paragraph_format.line_spacing = 1.15
    p_img_models.paragraph_format.space_after = Pt(6)
    p_img_models.add_run(
        "• DALL-E 3 (OpenAI): Superior textual coherence, complex multi-object composition, and automated prompt refinement.\n"
        "• Flux API (Black Forest Labs): Unmatched ultra-photorealism, intricate human anatomy rendering, and hyper-fast generation.\n"
        "• Gemini Imagen: Advanced visual aesthetics and high-resolution artistic generation.\n"
        "• Stable Diffusion: Open, customizable generation with flexible aspect ratios (1:1, 16:9, 9:16, 4:3, 3:2)."
    ).font.size = Pt(10)

    # 2.4 Skills Hub
    h2 = doc.add_heading(level=2)
    r_h2 = h2.add_run("2.4 Specialized Skills Hub")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(13)
    r_h2.bold = True
    r_h2.font.color.rgb = RGBColor(30, 41, 59)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Skills in Nashm AI are modular, specialized problem-solving packages that provide the AI with structured workflows, scripts, and "
        "domain-specific instructions (e.g., bioinformatics, chemical data parsing, advanced code refactoring). Each skill is defined via a standard "
        "SKILL.md specification featuring YAML frontmatter (name, displayTitle, description, and always-apply rules). Skills can trigger autonomously "
        "based on query semantics or be invoked explicitly by the user via interactive UI popovers and rendered as visual badges on message bubbles."
    ).font.size = Pt(10.5)

    # 2.5 Run Code Sandbox
    h2 = doc.add_heading(level=2)
    r_h2 = h2.add_run("2.5 Sandboxed Code Execution Engine (Piston Runtime)")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(13)
    r_h2.bold = True
    r_h2.font.color.rgb = RGBColor(30, 41, 59)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The Code Execution Engine empowers the AI to act as a true software engineer and computational scientist. Built on top of the "
        "Piston execution sandbox, code in Python 3, JavaScript/TypeScript, C++, Java, Rust, Go, PHP, and Bash is compiled and run in strict "
        "isolation with enforced CPU, memory, and timeout limits. Stdout, stderr, dataframes, and rendered mathematical plots are streamed back "
        "directly into the interactive chat interface."
    ).font.size = Pt(10.5)

    # 2.6 Interactive Artifacts
    h2 = doc.add_heading(level=2)
    r_h2 = h2.add_run("2.6 Interactive Visual Artifacts (Sandpack & Monaco)")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(13)
    r_h2.bold = True
    r_h2.font.color.rgb = RGBColor(30, 41, 59)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "When generating frontend components, interactive React applications, SVG graphics, or Mermaid architectural diagrams, Nashm AI does not "
        "simply display raw code. It spawns a dedicated, split-screen Artifacts sandbox powered by @codesandbox/sandpack-react and Monaco Editor. "
        "Users can preview running web applications in real-time, edit code dynamically, inspect syntax, and download production-ready code bundles instantly."
    ).font.size = Pt(10.5)

    # Insert feature screenshot if available
    screenshot_path = r"c:\Users\abdel\Desktop\nashmai\client\public\assets\features\deep-research.png"
    if os.path.exists(screenshot_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(4)
        p_img.add_run().add_picture(screenshot_path, width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(10)
        r_cap = p_cap.add_run("Figure 3: NASHM AI Production Interface — Interactive Tools & Multimodal Workflow")
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9)
        r_cap.italic = True
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECTION 3: CHAT HISTORY ARCHITECTURE & LIFECYCLE
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("3. Chat History Architecture & Lifecycle Management")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The conversation persistence engine in Nashm AI is designed for high-scale enterprise usability, cryptographic security, and "
        "flexible non-linear dialogue exploration. Key capabilities include:"
    ).font.size = Pt(10.5)

    chat_features = [
        ("Tree-Structured Conversation Graphs", "Conversations are stored as directed acyclic message trees (parentMessageId links). Users can branch (Fork) from any historical message to explore alternative analytical hypotheses without overwriting previous dialogue turns."),
        ("Chat Projects & Workspace Folders", "Users and teams can organize hundreds of conversations into structured projects (Chat Projects) with shared context and role-based permissions."),
        ("Conversation Pinning & Color Tags", "High-priority discussions can be pinned to the top of the navigation drawer and categorized using custom color-coded metadata tags for rapid visual indexing."),
        ("Sub-millisecond MeiliSearch Indexing", "Every message, title, and file attachment is indexed in real-time in MeiliSearch, enabling lightning-fast fuzzy search across years of historical dialogues."),
        ("End-to-End Encryption (E2EE)", "Client-side cryptographic encryption ensures conversation contents, titles, and attachments are encrypted before leaving the user's browser, preventing unauthorized access even at the database level."),
        ("Public Read-Only Shared Links", "Instant generation of cryptographic immutable snapshots of conversations for public or peer sharing, safely decoupled from future modifications in the author's private chat."),
        ("Multi-Format Export & Import", "One-click export of complete conversations or entire accounts into Markdown (.md), structured JSON (.json), and tabular CSV formats."),
        ("Ephemeral Chats (TTL Auto-Expiry)", "Support for temporary, confidential sessions that automatically self-destruct from database and cache layers upon session completion via MongoDB TTL indices."),
    ]

    t_chat = doc.add_table(rows=1, cols=2)
    format_table(t_chat, [Inches(2.3), Inches(4.2)], ["Architecture Component", "Technical Implementation & Enterprise Benefit"], chat_features)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # SECTION 4: AUTONOMOUS AGENT BUILDER
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("4. Autonomous Agent Builder & Multi-Agent Orchestration")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The Agent Builder panel is a comprehensive low-code studio allowing developers and business users to create, fine-tune, and "
        "deploy specialized AI agents tailored for specific business domains. The agent specification encompasses:"
    ).font.size = Pt(10.5)

    agent_points = [
        "• Identity & System Persona: Custom name, description, avatar generator/uploader, category assignment, and deep system metaprompts.",
        "• Model & Provider Routing: Free selection across OpenAI, Anthropic Claude 3.7, Google Gemini 2.0, DeepSeek R1, or local Ollama instances.",
        "• Tool & Capability Binding: One-click attachment of File Search, Web Search, Code Interpreter, Image Generator, Artifacts, and MCP Tools.",
        "• REST API Actions (OpenAPI/Swagger): Integration of enterprise REST APIs via Swagger JSON/YAML schemas with API Key, Bearer, and OAuth2 auth.",
        "• Multi-Agent Directed Graph (Edges): Graph-based workflow orchestration allowing primary agents to hand off sub-tasks to specialized sub-agents.",
        "• Conversation Starters: Predefined prompt buttons to guide end-users into effective interactions immediately.",
        "• Versioning & Access Controls: Complete version history rollback and multi-tier visibility (Private, Workspace Shared, Public Marketplace)."
    ]
    for pt in agent_points:
        p_pt = doc.add_paragraph()
        p_pt.paragraph_format.line_spacing = 1.15
        p_pt.paragraph_format.space_after = Pt(3)
        p_pt.add_run(pt).font.size = Pt(10)

    # -------------------------------------------------------------
    # SECTION 5: SMART CALENDAR & AI ACTION SCHEDULER
    # -------------------------------------------------------------
    doc.add_page_break()
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("5. Smart Calendar & Automated AI Action Scheduler")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Unique to Nashm AI, the Calendar module is not merely an interactive agenda for tracking manual meetings; it functions as an "
        "automated, background cron execution engine that triggers autonomous AI agents to perform scheduled research, data collation, "
        "and report generation on predefined time intervals."
    ).font.size = Pt(10.5)

    cal_schema_table = [
        ("eventType", "enum: ['event', 'action']", "Differentiates standard human calendar reminders from autonomous AI execution triggers."),
        ("agentId", "String (Agent Reference)", "Identifies the specific autonomous agent responsible for executing the automated action."),
        ("actionPrompt", "String (Max 5,000 chars)", "The comprehensive instructions and prompt executed by the agent upon trigger time."),
        ("status", "enum: ['pending', 'running', 'completed', 'failed', 'cancelled']", "State machine tracking background execution lifecycle."),
        ("recurrence", "enum: ['none', 'daily', 'weekly', 'monthly']", "Automated recurring cron scheduler for periodic intelligence briefings."),
        ("color", "Hex String (Default: #C41E3A)", "Royal Jordanian Crimson highlight for immediate recognition across Month, Week, and Agenda views."),
        ("executionResult", "String (Max 10,000 chars)", "Persistent storage of generated reports, markdown summaries, and computation outputs."),
        ("executedAt", "Date Timestamp", "Exact recorded execution completion timestamp for compliance and historical audit trails."),
    ]

    t_cal = doc.add_table(rows=1, cols=3)
    format_table(t_cal, [Inches(1.5), Inches(2.0), Inches(3.0)], ["Field Schema", "Data Type / Constraints", "Architectural Functionality"], cal_schema_table)

    # Insert Calendar Diagram
    diag_cal = r"c:\Users\abdel\Desktop\nashmai\scratch\diag_calendar_scheduler.png"
    if os.path.exists(diag_cal):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        p_img.add_run().add_picture(diag_cal, width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(10)
        r_cap = p_cap.add_run("Figure 4: NASHM AI Autonomous Calendar Action Scheduler State Machine")
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9)
        r_cap.italic = True
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    # -------------------------------------------------------------
    # SECTION 6: ENTERPRISE PROMPT LIBRARY
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("6. Enterprise Prompt Library & Templating Engine")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The Prompt Library standardizes prompt engineering across teams. Prompts are organized into Prompt Groups with rich metadata. "
        "Templates support dynamic variable interpolation (e.g. {{language}}, {{target_audience}}, {{code_snippet}}). When a prompt is "
        "invoked via keyboard shortcuts ('/' or '@' in the chat input), an interactive dialog automatically prompts the user to populate the "
        "variables, assembling a precision-engineered prompt in seconds."
    ).font.size = Pt(10.5)

    # -------------------------------------------------------------
    # SECTION 7: PERSISTENT LONG-TERM MEMORY (MEMORIES)
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("7. Persistent Long-Term Memory (Memories)")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Nashm AI incorporates a continuous cross-session memory engine that enables the model to recall user preferences, professional roles, "
        "coding standards, and personal contexts across all conversations without repetitive re-prompting."
    ).font.size = Pt(10.5)

    p_mem_pts = doc.add_paragraph()
    p_mem_pts.paragraph_format.line_spacing = 1.15
    p_mem_pts.paragraph_format.space_after = Pt(6)
    p_mem_pts.add_run(
        "• Automated & Manual Extraction: Facts are extracted autonomously during dialogue or created manually via the Memories side panel.\n"
        "• Structured Schema: Stored in MemoryEntrySchema with normalized keys (lowercase + underscores), string values, and tenant isolation.\n"
        "• Token Accounting & Badges: Real-time MemoryUsageBadge indicates total tokens consumed by memory entries in the prompt context.\n"
        "• Absolute User Control: Complete CRUD transparency allowing users to edit, purge individual memories, or clear memory entirely."
    ).font.size = Pt(10)

    doc.add_page_break()

    # -------------------------------------------------------------
    # SECTION 8: BOOKMARKS & INSIGHT CURATION
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("8. Bookmarks & Message Curation")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The Bookmarks panel provides an organized repository for saving critical AI responses, code snippets, and analytical formulas. "
        "Saved bookmarks feature customizable titles, descriptions, and color-coded tag associations. Through the dedicated Bookmark Table panel, "
        "users can filter saved insights and re-inject them into active conversation streams with a single click ('Add to conversation')."
    ).font.size = Pt(10.5)

    # -------------------------------------------------------------
    # SECTION 9: ATTACH FILES & MULTIMODAL INGESTION
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("9. File Attachment & Multimodal Ingestion Pipeline")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Nashm AI supports comprehensive file attachment workflows across all industry file types. Files are securely ingested via Multer "
        "and dispatched to configured storage providers (Local Secure Storage, Amazon S3, or Azure Blob Storage). High-resolution images are "
        "processed via Sharp and multimodal vision models, while documents undergo deep OCR and structured table normalization."
    ).font.size = Pt(10.5)

    # -------------------------------------------------------------
    # SECTION 10: MODEL PARAMETERS & INFERENCE CONTROLS
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("10. Fine-Grained Model Parameters & Inference Controls")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "The Parameters panel gives advanced users granular mathematical control over the LLM generation sampling distribution:"
    ).font.size = Pt(10.5)

    param_table_data = [
        ("Temperature (0.0 - 2.0)", "Controls randomness and entropy. Low values (0.0 - 0.3) enforce deterministic logic and exact code syntax; higher values (0.8 - 1.2) induce creative variance."),
        ("Top_P / Nucleus Sampling (0.0 - 1.0)", "Restricts token candidate selection to the smallest set whose cumulative probability exceeds threshold P, eliminating low-probability tail tokens."),
        ("Top_K (1 - 100)", "Hard limit restricting the model to select exclusively from the K highest-probability next tokens."),
        ("Max Output Tokens (1 - 128k+)", "Hard ceiling limiting the maximum response generation length to safeguard API quotas and optimize latency."),
        ("Frequency Penalty (-2.0 - 2.0)", "Penalizes tokens proportionally based on their existing frequency in the output, discouraging verbatim phrase repetition."),
        ("Presence Penalty (-2.0 - 2.0)", "Penalizes tokens based on whether they have appeared in the generated text, encouraging exploration of novel concepts."),
        ("Stop Sequences", "Custom string delimiters that immediately halt generation when emitted by the model."),
        ("Custom Presets Management", "Enables saving custom combinations of models, prompts, and parameter values as reusable Presets for instant application."),
    ]

    t_param = doc.add_table(rows=1, cols=2)
    format_table(t_param, [Inches(2.5), Inches(4.0)], ["Inference Parameter", "Mathematical & Operational Impact"], param_table_data)

    p_sp2 = doc.add_paragraph()
    p_sp2.paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # SECTION 11: MODEL CONTEXT PROTOCOL (MCP)
    # -------------------------------------------------------------
    doc.add_page_break()
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("11. Model Context Protocol (MCP) Infrastructure & Settings")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    p.add_run(
        "Nashm AI provides native enterprise support for the open Model Context Protocol (MCP) standard, transforming the platform into an "
        "active operational hub connected to external enterprise databases, local operating system environments, and cloud microservices."
    ).font.size = Pt(10.5)

    p_mcp_pts = doc.add_paragraph()
    p_mcp_pts.paragraph_format.line_spacing = 1.15
    p_mcp_pts.paragraph_format.space_after = Pt(6)
    p_mcp_pts.add_run(
        "• Dual Transport Adapters: Supports local sub-process execution via Stdio Transport (Node.js, Python, CLI binaries) and remote web services via SSE Transport (HTTP/Server-Sent Events).\n"
        "• UserConnectionManager: Dedicated backend lifecycle manager managing isolated connections per tenant and user.\n"
        "• Dynamic Tool Discovery: Automatically queries connected MCP servers for exported tool schemas and compiles them into model-compatible JSON Schemas.\n"
        "• MCP Builder Panel: User-friendly management interface for registering servers, configuring secret environment variables, and monitoring health badges."
    ).font.size = Pt(10)

    # Insert MCP Diagram
    diag_mcp = r"c:\Users\abdel\Desktop\nashmai\scratch\diag_mcp_framework.png"
    if os.path.exists(diag_mcp):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        p_img.add_run().add_picture(diag_mcp, width=Inches(6.2))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(10)
        r_cap = p_cap.add_run("Figure 5: NASHM AI Model Context Protocol (MCP) Integration Framework")
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9)
        r_cap.italic = True
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    # -------------------------------------------------------------
    # SECTION 12: FEATURE MATRIX & CONCLUSION
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("12. Comprehensive Feature Matrix & Technical Summary")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(18)
    r_h1.bold = True
    r_h1.font.color.rgb = RGBColor(196, 30, 58)

    matrix_data = [
        ("File Search (RAG)", "Vector Embeddings & Cosine Search", "Zero-hallucination document synthesis with verifiable citations"),
        ("Web Search", "SearXNG / Google / Tavily APIs", "Real-time web browsing, news extraction, and live data groundings"),
        ("Image Generation", "DALL-E 3 / Flux API / Gemini", "High-fidelity photorealistic & vector image synthesis with aspect ratio controls"),
        ("Skills Hub", "SKILL.md & Scripts Architecture", "Specialized domain workflows with auto-priming and manual popover execution"),
        ("Run Code Sandbox", "Piston Docker Sandboxed Runtime", "Multi-language secure code compilation, stdout/stderr and graph plotting"),
        ("Interactive Artifacts", "Sandpack React & Monaco Editor", "Split-screen live web application sandbox and instant code export"),
        ("Chat History", "MeiliSearch / E2EE / Mongo Trees", "Tree branching (forks), project folders, end-to-end encryption, multi-format export"),
        ("Agent Builder", "Multi-Agent Graph & OpenAPI Actions", "Custom autonomous agents, directed graph workflows, and API integrations"),
        ("Smart Calendar", "Automated AI Action Scheduler", "Scheduled autonomous AI tasks, recurrence rules, and persistent execution results"),
        ("Prompt Library", "Dynamic Variables & Slash Commands", "Enterprise prompt templates with interactive variable interpolation"),
        ("Memories", "Long-Term Key-Value Memory Store", "Continuous user profiling, token usage badges, and full CRUD control"),
        ("Bookmarks", "Message Tagging & Table Viewer", "Curated insight repository with direct active context re-injection"),
        ("Attach Files", "Multi-Driver Multer Pipeline", "Multi-format OCR document ingestion with S3/Azure/Local storage drivers"),
        ("Model Parameters", "Dynamic Sliders & Presets", "Granular Temperature, Top_P, Penalties, and custom Presets saving"),
        ("MCP Settings", "Model Context Protocol Manager", "Stdio & SSE protocol transports connecting AI directly to enterprise systems"),
    ]

    t_matrix = doc.add_table(rows=1, cols=3)
    format_table(t_matrix, [Inches(1.8), Inches(2.2), Inches(2.5)], ["Platform Feature", "Core Technology", "Enterprise Capabilities"], matrix_data)

    p_conc = doc.add_paragraph()
    p_conc.paragraph_format.space_before = Pt(16)
    p_conc.paragraph_format.line_spacing = 1.15
    r_conc = p_conc.add_run(
        "Conclusion: NASHM AI (نشمي AI) establishes an unprecedented benchmark for sovereign artificial intelligence systems in the Arab world. "
        "By fusing state-of-the-art engineering, military-grade security, intuitive user experience, and native Arabic language intelligence, "
        "Nashm AI provides organizations with an uncompromising, world-class foundation for digital innovation and autonomous productivity."
    )
    r_conc.font.name = "Calibri"
    r_conc.font.size = Pt(11)
    r_conc.bold = True
    r_conc.font.color.rgb = RGBColor(30, 41, 59)

    out_file = r"c:\Users\abdel\Desktop\nashmai\NASHM_AI_Enterprise_Technical_Report.docx"
    doc.save(out_file)
    print(f"Successfully generated report at: {out_file}")

if __name__ == "__main__":
    main()
