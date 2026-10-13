"""
Bonsai IFC Microservice — FastAPI server wrapping IfcOpenShell for IFC operations.
Provides REST endpoints for IFC creation, parsing, validation, conversion, and quantity takeoff.
Runs on port 8100 alongside the Node.js server.
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
import os
import json
import uuid
import tempfile
import shutil
from pathlib import Path

from ifc_converter import create_ifc_from_project
from ifc_parser import parse_ifc_file, parse_ifc_to_studio_elements, validate_ifc_file, get_ifc_quantity_takeoff

app = FastAPI(
    title="Bonsai IFC Service",
    description="IfcOpenShell-powered IFC processing service for BIM Design Studio",
    version="1.0.0",
)

# CORS for the Node.js backend and Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output directory for generated IFC files
IFC_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'bim', 'ifc_exports')
IFC_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'bim', 'ifc_uploads')
os.makedirs(IFC_OUTPUT_DIR, exist_ok=True)
os.makedirs(IFC_UPLOAD_DIR, exist_ok=True)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    import ifcopenshell
    return {
        "status": "ok",
        "service": "Bonsai IFC Service",
        "ifcopenshell_version": ifcopenshell.version,
        "schema_support": ["IFC2X3", "IFC4", "IFC4X3"],
    }


@app.post("/ifc/export-elements")
async def export_elements_to_ifc(project_data: dict = None):
    """
    Convert BIM Design Studio project elements to an IFC4 file.
    
    Expects JSON body with project data including buildings, floors, and elements.
    Returns the generated IFC file path and metadata.
    """
    if not project_data:
        raise HTTPException(status_code=400, detail="Project data is required")
    
    try:
        ifc_file, entity_count = create_ifc_from_project(project_data)
        
        # Generate output filename
        project_name = project_data.get('project_name', 'bim-project')
        safe_name = "".join(c if c.isalnum() or c in '-_' else '_' for c in project_name)
        filename = f"{safe_name}_{uuid.uuid4().hex[:8]}.ifc"
        output_path = os.path.join(IFC_OUTPUT_DIR, filename)
        
        ifc_file.write(output_path)
        file_size = os.path.getsize(output_path)
        
        return {
            "success": True,
            "file_name": filename,
            "file_path": output_path,
            "file_size": file_size,
            "entity_count": entity_count,
            "ifc_version": "IFC4",
            "download_url": f"/ifc/download/{filename}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IFC export failed: {str(e)}")


@app.post("/ifc/create")
async def create_ifc_project(
    project_name: str = Form("BIM Project"),
    project_data: str = Form(...)
):
    """Create a new IFC file from form data."""
    try:
        data = json.loads(project_data)
        data['project_name'] = project_name
        ifc_file, entity_count = create_ifc_from_project(data)
        
        safe_name = "".join(c if c.isalnum() or c in '-_' else '_' for c in project_name)
        filename = f"{safe_name}_{uuid.uuid4().hex[:8]}.ifc"
        output_path = os.path.join(IFC_OUTPUT_DIR, filename)
        
        ifc_file.write(output_path)
        file_size = os.path.getsize(output_path)
        
        return {
            "success": True,
            "file_name": filename,
            "file_path": output_path,
            "file_size": file_size,
            "entity_count": entity_count,
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in project_data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ifc/parse")
async def parse_ifc(file: UploadFile = File(...)):
    """Parse an uploaded IFC file and extract structured data."""
    if not file.filename.lower().endswith('.ifc'):
        raise HTTPException(status_code=400, detail="File must be an IFC file")
    
    # Save uploaded file temporarily
    temp_path = os.path.join(IFC_UPLOAD_DIR, f"temp_{uuid.uuid4().hex[:8]}.ifc")
    try:
        with open(temp_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        result = parse_ifc_file(temp_path)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IFC parse failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/ifc/import-to-studio")
async def import_ifc_to_studio(file: UploadFile = File(...)):
    """
    Parse an IFC file and convert its entities to BIM Design Studio format.
    This enables round-trip editing — import IFC → edit → re-export.
    """
    if not file.filename.lower().endswith('.ifc'):
        raise HTTPException(status_code=400, detail="File must be an IFC file")
    
    # Save the uploaded file permanently (for reference)
    save_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    save_path = os.path.join(IFC_UPLOAD_DIR, save_name)
    
    try:
        with open(save_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        result = parse_ifc_to_studio_elements(save_path)
        result['source_file'] = save_name
        result['source_path'] = save_path
        
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IFC import failed: {str(e)}")


@app.post("/ifc/validate")
async def validate_ifc(file: UploadFile = File(None), file_path: str = Form(None)):
    """Validate an IFC file against schema and structural rules."""
    temp_path = None
    
    try:
        if file:
            temp_path = os.path.join(IFC_UPLOAD_DIR, f"validate_{uuid.uuid4().hex[:8]}.ifc")
            with open(temp_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            validate_path = temp_path
        elif file_path and os.path.exists(file_path):
            validate_path = file_path
        else:
            raise HTTPException(status_code=400, detail="Provide either a file upload or file_path")
        
        result = validate_ifc_file(validate_path)
        return {"success": True, "validation": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/ifc/quantity-takeoff")
async def quantity_takeoff(file: UploadFile = File(None), file_path: str = Form(None)):
    """Extract quantity takeoff from an IFC file."""
    temp_path = None
    
    try:
        if file:
            temp_path = os.path.join(IFC_UPLOAD_DIR, f"qty_{uuid.uuid4().hex[:8]}.ifc")
            with open(temp_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            qty_path = temp_path
        elif file_path and os.path.exists(file_path):
            qty_path = file_path
        else:
            raise HTTPException(status_code=400, detail="Provide either a file upload or file_path")
        
        result = get_ifc_quantity_takeoff(qty_path)
        return {"success": True, "takeoff": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quantity takeoff failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/ifc/download/{filename}")
async def download_ifc(filename: str):
    """Download a generated IFC file."""
    file_path = os.path.join(IFC_OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        media_type="application/x-step",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/ifc/schema-info")
async def schema_info():
    """Get IFC schema entity types and property set definitions."""
    return {
        "supported_schemas": ["IFC2X3", "IFC4", "IFC4X3"],
        "element_types": {
            "architectural": ["IfcWall", "IfcWallStandardCase", "IfcDoor", "IfcWindow", "IfcStair", "IfcStairFlight", "IfcRamp", "IfcRoof", "IfcSlab", "IfcCeiling", "IfcCovering"],
            "structural": ["IfcColumn", "IfcBeam", "IfcFooting", "IfcPile", "IfcPlate", "IfcMember"],
            "mep": ["IfcDistributionElement", "IfcFlowSegment", "IfcFlowTerminal", "IfcFlowFitting"],
            "spatial": ["IfcProject", "IfcSite", "IfcBuilding", "IfcBuildingStorey", "IfcSpace"],
            "furniture": ["IfcFurnishingElement", "IfcFurniture"],
        },
        "common_property_sets": [
            "Pset_WallCommon", "Pset_DoorCommon", "Pset_WindowCommon",
            "Pset_ColumnCommon", "Pset_BeamCommon", "Pset_SlabCommon",
            "Pset_SpaceCommon", "Pset_StairCommon",
        ],
        "quantity_sets": [
            "Qto_WallBaseQuantities", "Qto_ColumnBaseQuantities",
            "Qto_BeamBaseQuantities", "Qto_SlabBaseQuantities",
            "Qto_SpaceBaseQuantities", "Qto_DoorBaseQuantities",
            "Qto_WindowBaseQuantities",
        ],
    }


@app.post("/ifc/diff")
async def diff_ifc_files(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    """Compare two IFC files and return differences."""
    temp1 = os.path.join(IFC_UPLOAD_DIR, f"diff1_{uuid.uuid4().hex[:8]}.ifc")
    temp2 = os.path.join(IFC_UPLOAD_DIR, f"diff2_{uuid.uuid4().hex[:8]}.ifc")
    
    try:
        with open(temp1, 'wb') as f:
            f.write(await file1.read())
        with open(temp2, 'wb') as f:
            f.write(await file2.read())
        
        import ifcopenshell
        ifc1 = ifcopenshell.open(temp1)
        ifc2 = ifcopenshell.open(temp2)
        
        # Count entities in each
        counts1 = {}
        for e in ifc1:
            t = e.is_a()
            counts1[t] = counts1.get(t, 0) + 1
        
        counts2 = {}
        for e in ifc2:
            t = e.is_a()
            counts2[t] = counts2.get(t, 0) + 1
        
        # Find GUIDs in each
        guids1 = set()
        guids2 = set()
        for e in ifc1:
            if hasattr(e, 'GlobalId'):
                guids1.add(e.GlobalId)
        for e in ifc2:
            if hasattr(e, 'GlobalId'):
                guids2.add(e.GlobalId)
        
        added = guids2 - guids1
        removed = guids1 - guids2
        common = guids1 & guids2
        
        all_types = set(list(counts1.keys()) + list(counts2.keys()))
        type_diff = {}
        for t in sorted(all_types):
            c1 = counts1.get(t, 0)
            c2 = counts2.get(t, 0)
            if c1 != c2:
                type_diff[t] = {'file1': c1, 'file2': c2, 'delta': c2 - c1}
        
        return {
            "success": True,
            "diff": {
                "file1_entities": len(list(ifc1)),
                "file2_entities": len(list(ifc2)),
                "added_guids": len(added),
                "removed_guids": len(removed),
                "common_guids": len(common),
                "type_differences": type_diff,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diff failed: {str(e)}")
    finally:
        for f in [temp1, temp2]:
            if os.path.exists(f):
                os.remove(f)


if __name__ == "__main__":
    print("🏗️  Bonsai IFC Service starting on port 8100...")
    print("📡 IfcOpenShell-powered IFC processing")
    uvicorn.run(app, host="0.0.0.0", port=8100, log_level="info")
