"""
IFC Converter — Maps BIM Design Studio elements to IFC4 entities using IfcOpenShell.
Handles the conversion of walls, doors, windows, columns, beams, stairs, rooms, and furniture
from the internal JSON format to proper IFC entities with geometry.
"""
import ifcopenshell
import ifcopenshell.api
import ifcopenshell.util.element
import math
import time
import uuid
import json
import os

# Template for creating a base IFC4 file
IFC_TEMPLATE = """ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('','%(timestamp)s',('BIM Design Studio'),('KEC Consultancy'),'IfcOpenShell','BIM Design Studio','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPERSON($,$,'',$,$,$,$,$);
#2=IFCORGANIZATION($,'BIM Design Studio',$,$,$);
#3=IFCPERSONANDORGANIZATION(#1,#2,$);
#4=IFCAPPLICATION(#2,'1.0','BIM Design Studio','BIMDesignStudio');
#5=IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,#3,#4,%(unix_time)s);
#6=IFCDIRECTION((1.,0.,0.));
#7=IFCDIRECTION((0.,0.,1.));
#8=IFCCARTESIANPOINT((0.,0.,0.));
#9=IFCAXIS2PLACEMENT3D(#8,#7,#6);
#10=IFCDIRECTION((0.,1.,0.));
#11=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#9,#10);
#12=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#11,$,.MODEL_VIEW.,$);
#13=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Axis','Model',*,*,*,*,#11,$,.GRAPH_VIEW.,$);
#14=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#15=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#16=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);
#17=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);
#18=IFCUNITASSIGNMENT((#14,#15,#16,#17));
#19=IFCPROJECT('%(project_guid)s',#5,'%(project_name)s',$,$,$,$,(#11),#18);
ENDSEC;
END-ISO-10303-21;
"""

def generate_guid():
    """Generate an IFC-compatible GUID."""
    return ifcopenshell.guid.new()

def create_base_ifc(project_name="BIM Project"):
    """Create a base IFC4 file with project, site, building hierarchy."""
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%S")
    unix_time = int(time.time())
    project_guid = generate_guid()
    
    template_data = {
        'timestamp': timestamp,
        'unix_time': unix_time,
        'project_guid': project_guid,
        'project_name': project_name,
    }
    
    temp_path = os.path.join(os.path.dirname(__file__), f'_temp_{uuid.uuid4().hex[:8]}.ifc')
    try:
        with open(temp_path, 'w') as f:
            f.write(IFC_TEMPLATE % template_data)
        ifc_file = ifcopenshell.open(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
    
    return ifc_file

def create_ifc_from_project(project_data):
    """
    Convert a BIM Design Studio project (JSON) into a full IFC4 file.
    
    project_data structure:
    {
        "project_name": "My Project",
        "site_data": { "address": "...", "area": ... },
        "buildings": [
            {
                "name": "Building A",
                "floors": [
                    {
                        "floor_name": "Ground Floor",
                        "floor_number": 0,
                        "floor_height": 0,
                        "total_area": ...,
                        "elements": {
                            "walls": [...], "columns": [...], "doors": [...],
                            "windows": [...], "stairs": [...], "beams": [...],
                            "furniture": [...], "rooms": [...]
                        }
                    }
                ]
            }
        ]
    }
    """
    project_name = project_data.get('project_name', 'BIM Project')
    ifc_file = create_base_ifc(project_name)
    
    project = ifc_file.by_type("IfcProject")[0]
    owner_history = ifc_file.by_type("IfcOwnerHistory")[0]
    context = ifc_file.by_type("IfcGeometricRepresentationContext")[0]
    body_context = None
    for ctx in ifc_file.by_type("IfcGeometricRepresentationSubContext"):
        if ctx.ContextIdentifier == "Body":
            body_context = ctx
            break
    if not body_context:
        body_context = context
    
    # Create site
    site_placement = _create_local_placement(ifc_file)
    site = ifc_file.createIfcSite(
        generate_guid(), owner_history, 
        project_data.get('site_data', {}).get('name', 'Default Site'),
        None, None, site_placement, None, None, 
        .ELEMENT., None, None, None, None, None
    )
    ifc_file.createIfcRelAggregates(generate_guid(), owner_history, None, None, project, [site])
    
    entity_count = 0
    
    for building_data in project_data.get('buildings', []):
        building_placement = _create_local_placement(ifc_file, relative_to=site_placement)
        building = ifc_file.createIfcBuilding(
            generate_guid(), owner_history,
            building_data.get('name', 'Building'),
            None, None, building_placement, None, None,
            .ELEMENT., None, None, None
        )
        ifc_file.createIfcRelAggregates(generate_guid(), owner_history, None, None, site, [building])
        
        for floor_data in building_data.get('floors', []):
            floor_height = floor_data.get('floor_height', 0)
            storey_elevation = float(floor_height)
            
            storey_placement = _create_local_placement(
                ifc_file, 
                relative_to=building_placement,
                z_offset=storey_elevation
            )
            
            storey = ifc_file.createIfcBuildingStorey(
                generate_guid(), owner_history,
                floor_data.get('floor_name', f'Level {floor_data.get("floor_number", 0)}'),
                None, None, storey_placement, None, None,
                .ELEMENT., storey_elevation
            )
            ifc_file.createIfcRelAggregates(generate_guid(), owner_history, None, None, building, [storey])
            
            elements = floor_data.get('elements', {})
            storey_products = []
            
            # Convert walls
            for wall_data in elements.get('walls', []):
                wall = _create_wall(ifc_file, owner_history, body_context, storey_placement, wall_data)
                if wall:
                    storey_products.append(wall)
                    entity_count += 1
            
            # Convert columns
            for col_data in elements.get('columns', []):
                column = _create_column(ifc_file, owner_history, body_context, storey_placement, col_data)
                if column:
                    storey_products.append(column)
                    entity_count += 1
            
            # Convert beams
            for beam_data in elements.get('beams', []):
                beam = _create_beam(ifc_file, owner_history, body_context, storey_placement, beam_data)
                if beam:
                    storey_products.append(beam)
                    entity_count += 1
            
            # Convert doors
            for door_data in elements.get('doors', []):
                door = _create_door(ifc_file, owner_history, body_context, storey_placement, door_data)
                if door:
                    storey_products.append(door)
                    entity_count += 1
            
            # Convert windows
            for win_data in elements.get('windows', []):
                window = _create_window(ifc_file, owner_history, body_context, storey_placement, win_data)
                if window:
                    storey_products.append(window)
                    entity_count += 1
            
            # Convert stairs
            for stair_data in elements.get('stairs', []):
                stair = _create_stair(ifc_file, owner_history, body_context, storey_placement, stair_data)
                if stair:
                    storey_products.append(stair)
                    entity_count += 1
            
            # Convert furniture
            for furn_data in elements.get('furniture', []):
                furniture = _create_furniture(ifc_file, owner_history, body_context, storey_placement, furn_data)
                if furniture:
                    storey_products.append(furniture)
                    entity_count += 1
            
            # Convert rooms → IfcSpace
            for room_data in elements.get('rooms', []):
                space = _create_space(ifc_file, owner_history, body_context, storey_placement, room_data)
                if space:
                    storey_products.append(space)
                    entity_count += 1
            
            # Relate products to storey
            if storey_products:
                ifc_file.createIfcRelContainedInSpatialStructure(
                    generate_guid(), owner_history, None, None,
                    storey_products, storey
                )
    
    return ifc_file, entity_count


# ═══════════════════════════════════════════════════════════════
# Geometry Helpers
# ═══════════════════════════════════════════════════════════════

def _create_local_placement(ifc_file, relative_to=None, x_offset=0, y_offset=0, z_offset=0):
    """Create an IfcLocalPlacement with optional offset."""
    point = ifc_file.createIfcCartesianPoint((float(x_offset), float(y_offset), float(z_offset)))
    dir_z = ifc_file.createIfcDirection((0., 0., 1.))
    dir_x = ifc_file.createIfcDirection((1., 0., 0.))
    axis2 = ifc_file.createIfcAxis2Placement3D(point, dir_z, dir_x)
    return ifc_file.createIfcLocalPlacement(relative_to, axis2)

def _create_placement_from_point(ifc_file, relative_to, x, y, z=0, rotation=0):
    """Create a placement at a specific XY point with optional rotation."""
    point = ifc_file.createIfcCartesianPoint((float(x), float(y), float(z)))
    dir_z = ifc_file.createIfcDirection((0., 0., 1.))
    
    if rotation != 0:
        rad = math.radians(float(rotation))
        dir_x = ifc_file.createIfcDirection((math.cos(rad), math.sin(rad), 0.))
    else:
        dir_x = ifc_file.createIfcDirection((1., 0., 0.))
    
    axis2 = ifc_file.createIfcAxis2Placement3D(point, dir_z, dir_x)
    return ifc_file.createIfcLocalPlacement(relative_to, axis2)

def _create_extruded_area_solid(ifc_file, context, profile_points, height):
    """Create an IfcExtrudedAreaSolid from a list of 2D profile points."""
    ifc_points = [ifc_file.createIfcCartesianPoint((float(p[0]), float(p[1]))) for p in profile_points]
    # Close the loop
    ifc_points.append(ifc_points[0])
    
    polyline = ifc_file.createIfcPolyline(ifc_points)
    profile = ifc_file.createIfcArbitraryClosedProfileDef(.AREA., None, polyline)
    
    point = ifc_file.createIfcCartesianPoint((0., 0., 0.))
    dir_z = ifc_file.createIfcDirection((0., 0., 1.))
    dir_x = ifc_file.createIfcDirection((1., 0., 0.))
    axis2 = ifc_file.createIfcAxis2Placement3D(point, dir_z, dir_x)
    
    extrude_dir = ifc_file.createIfcDirection((0., 0., 1.))
    
    return ifc_file.createIfcExtrudedAreaSolid(profile, axis2, extrude_dir, float(height))

def _create_rectangle_profile(ifc_file, width, depth):
    """Create a rectangular profile definition."""
    point = ifc_file.createIfcCartesianPoint((0., 0.))
    dir_x = ifc_file.createIfcDirection((1., 0.))
    axis2 = ifc_file.createIfcAxis2Placement2D(point, dir_x)
    return ifc_file.createIfcRectangleProfileDef(.AREA., None, axis2, float(width), float(depth))

def _create_circle_profile(ifc_file, radius):
    """Create a circular profile definition."""
    point = ifc_file.createIfcCartesianPoint((0., 0.))
    dir_x = ifc_file.createIfcDirection((1., 0.))
    axis2 = ifc_file.createIfcAxis2Placement2D(point, dir_x)
    return ifc_file.createIfcCircleProfileDef(.AREA., None, axis2, float(radius))

def _create_body_representation(ifc_file, context, solid):
    """Wrap a solid in an IfcShapeRepresentation."""
    return ifc_file.createIfcShapeRepresentation(context, 'Body', 'SweptSolid', [solid])

def _create_product_shape(ifc_file, representations):
    """Create an IfcProductDefinitionShape."""
    return ifc_file.createIfcProductDefinitionShape(None, None, representations)


# ═══════════════════════════════════════════════════════════════
# Element Creators
# ═══════════════════════════════════════════════════════════════

def _create_wall(ifc_file, owner_history, context, storey_placement, wall_data):
    """Create an IfcWallStandardCase from wall data with start/end points."""
    start = wall_data.get('start_point')
    end = wall_data.get('end_point')
    if not start or not end:
        return None
    
    sx, sy = float(start.get('x', 0)), float(start.get('y', 0))
    ex, ey = float(end.get('x', 0)), float(end.get('y', 0))
    thickness = float(wall_data.get('thickness', 230))
    height = float(wall_data.get('height', 3000))
    
    # Calculate wall direction and length
    dx = ex - sx
    dy = ey - sy
    length = math.sqrt(dx * dx + dy * dy)
    if length < 1:
        return None
    
    # Angle of the wall
    angle = math.atan2(dy, dx)
    
    # Place at start point, rotated to face end point
    placement = _create_placement_from_point(
        ifc_file, storey_placement,
        sx, sy, 0, math.degrees(angle)
    )
    
    # Rectangular profile: length × thickness, extruded by height
    half_t = thickness / 2.0
    profile_points = [
        (0, -half_t),
        (length, -half_t),
        (length, half_t),
        (0, half_t),
    ]
    
    solid = _create_extruded_area_solid(ifc_file, context, profile_points, height)
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    wall_name = wall_data.get('name', wall_data.get('wall_type', 'Wall'))
    
    wall = ifc_file.createIfcWallStandardCase(
        generate_guid(), owner_history,
        wall_name, None, None,
        placement, shape, None
    )
    
    # Add property set
    _add_property_set(ifc_file, owner_history, wall, 'Pset_WallCommon', {
        'IsExternal': wall_data.get('wall_type', '') in ['exterior', 'compound'],
        'Reference': wall_data.get('wall_type', 'interior'),
        'ThermalTransmittance': 2.5,
    })
    
    # Add quantity set
    wall_area = (length * height) / 1e6  # mm² → m²
    wall_volume = wall_area * thickness / 1e3  # → m³ (approx)
    _add_quantity_set(ifc_file, owner_history, wall, 'Qto_WallBaseQuantities', {
        'Length': length / 1000.0,
        'Height': height / 1000.0,
        'Width': thickness / 1000.0,
        'GrossSideArea': wall_area,
        'GrossVolume': wall_volume,
    })
    
    return wall

def _create_column(ifc_file, owner_history, context, storey_placement, col_data):
    """Create an IfcColumn from column data."""
    pos = col_data.get('position')
    if not pos:
        return None
    
    x = float(pos.get('x', 0))
    y = float(pos.get('y', 0))
    width = float(col_data.get('width', 300))
    depth = float(col_data.get('depth', col_data.get('width', 300)))
    height = float(col_data.get('height', 3000))
    rotation = float(col_data.get('rotation', 0))
    
    placement = _create_placement_from_point(ifc_file, storey_placement, x, y, 0, rotation)
    
    is_circular = col_data.get('shape') == 'circular'
    
    if is_circular:
        radius = float(col_data.get('diameter', width)) / 2.0
        profile = _create_circle_profile(ifc_file, radius)
    else:
        profile = _create_rectangle_profile(ifc_file, width, depth)
    
    # Extruded solid
    point = ifc_file.createIfcCartesianPoint((0., 0., 0.))
    dir_z = ifc_file.createIfcDirection((0., 0., 1.))
    dir_x = ifc_file.createIfcDirection((1., 0., 0.))
    axis2 = ifc_file.createIfcAxis2Placement3D(point, dir_z, dir_x)
    extrude_dir = ifc_file.createIfcDirection((0., 0., 1.))
    solid = ifc_file.createIfcExtrudedAreaSolid(profile, axis2, extrude_dir, float(height))
    
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    column = ifc_file.createIfcColumn(
        generate_guid(), owner_history,
        col_data.get('name', 'Column'), None, None,
        placement, shape, None
    )
    
    return column

def _create_beam(ifc_file, owner_history, context, storey_placement, beam_data):
    """Create an IfcBeam from beam data."""
    pos = beam_data.get('position')
    if not pos:
        return None
    
    x = float(pos.get('x', 0))
    y = float(pos.get('y', 0))
    width = float(beam_data.get('width', 230))
    depth = float(beam_data.get('depth', 450))
    length = float(beam_data.get('length', 3000))
    rotation = float(beam_data.get('rotation', 0))
    
    # Beams are placed at their position and extruded along their length
    placement = _create_placement_from_point(ifc_file, storey_placement, x, y, 0, rotation)
    
    profile = _create_rectangle_profile(ifc_file, width, depth)
    
    point = ifc_file.createIfcCartesianPoint((0., 0., 0.))
    dir_z = ifc_file.createIfcDirection((0., 0., 1.))
    dir_x = ifc_file.createIfcDirection((1., 0., 0.))
    axis2 = ifc_file.createIfcAxis2Placement3D(point, dir_z, dir_x)
    extrude_dir = ifc_file.createIfcDirection((1., 0., 0.))  # Beams extrude along X
    solid = ifc_file.createIfcExtrudedAreaSolid(profile, axis2, extrude_dir, float(length))
    
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    beam = ifc_file.createIfcBeam(
        generate_guid(), owner_history,
        beam_data.get('name', 'Beam'), None, None,
        placement, shape, None
    )
    
    return beam

def _create_door(ifc_file, owner_history, context, storey_placement, door_data):
    """Create an IfcDoor from door data."""
    pos = door_data.get('position')
    if not pos:
        return None
    
    x = float(pos.get('x', 0))
    y = float(pos.get('y', 0))
    width = float(door_data.get('width', 900))
    height = float(door_data.get('height', 2100))
    depth = 100.0  # Door panel thickness
    rotation = float(door_data.get('rotation', 0))
    
    placement = _create_placement_from_point(ifc_file, storey_placement, x, y, 0, rotation)
    
    # Simple box representation for the door
    half_w = width / 2.0
    half_d = depth / 2.0
    profile_points = [
        (-half_w, -half_d),
        (half_w, -half_d),
        (half_w, half_d),
        (-half_w, half_d),
    ]
    
    solid = _create_extruded_area_solid(ifc_file, context, profile_points, height)
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    door_type = door_data.get('door_type', door_data.get('type', 'single'))
    
    door = ifc_file.createIfcDoor(
        generate_guid(), owner_history,
        door_data.get('name', f'{door_type.title()} Door'), None, None,
        placement, shape, None,
        float(height), float(width)
    )
    
    _add_property_set(ifc_file, owner_history, door, 'Pset_DoorCommon', {
        'IsExternal': door_type in ['main', 'fire'],
        'Reference': door_type,
        'FireRating': 'FD30' if door_type == 'fire' else '',
    })
    
    return door

def _create_window(ifc_file, owner_history, context, storey_placement, win_data):
    """Create an IfcWindow from window data."""
    pos = win_data.get('position')
    if not pos:
        return None
    
    x = float(pos.get('x', 0))
    y = float(pos.get('y', 0))
    width = float(win_data.get('width', 1200))
    height = float(win_data.get('height', 1200))
    sill_height = float(win_data.get('sill_height', 900))
    depth = 80.0  # Window frame thickness
    rotation = float(win_data.get('rotation', 0))
    
    placement = _create_placement_from_point(ifc_file, storey_placement, x, y, sill_height, rotation)
    
    half_w = width / 2.0
    half_d = depth / 2.0
    profile_points = [
        (-half_w, -half_d),
        (half_w, -half_d),
        (half_w, half_d),
        (-half_w, half_d),
    ]
    
    solid = _create_extruded_area_solid(ifc_file, context, profile_points, height)
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    win_type = win_data.get('window_type', win_data.get('type', 'casement'))
    
    window = ifc_file.createIfcWindow(
        generate_guid(), owner_history,
        win_data.get('name', f'{win_type.title()} Window'), None, None,
        placement, shape, None,
        float(height), float(width)
    )
    
    _add_property_set(ifc_file, owner_history, window, 'Pset_WindowCommon', {
        'IsExternal': True,
        'Reference': win_type,
        'ThermalTransmittance': 5.8,
    })
    
    return window

def _create_stair(ifc_file, owner_history, context, storey_placement, stair_data):
    """Create an IfcStairFlight from stair data."""
    pos = stair_data.get('position')
    if not pos:
        return None
    
    x = float(pos.get('x', 0))
    y = float(pos.get('y', 0))
    width = float(stair_data.get('width', 1200))
    total_height = float(stair_data.get('total_height', 3000))
    num_risers = int(stair_data.get('num_risers', 18))
    riser_height = float(stair_data.get('riser_height', total_height / num_risers))
    tread_depth = float(stair_data.get('tread_depth', 270))
    rotation = float(stair_data.get('rotation', 0))
    
    placement = _create_placement_from_point(ifc_file, storey_placement, x, y, 0, rotation)
    
    # Simplified box representation for the stair run
    total_run = tread_depth * num_risers
    half_w = width / 2.0
    profile_points = [
        (0, -half_w),
        (total_run, -half_w),
        (total_run, half_w),
        (0, half_w),
    ]
    
    solid = _create_extruded_area_solid(ifc_file, context, profile_points, total_height)
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    stair = ifc_file.createIfcStairFlight(
        generate_guid(), owner_history,
        stair_data.get('name', 'Stair'), None, None,
        placement, shape, None,
        num_risers, num_risers - 1, 
        float(riser_height), float(tread_depth)
    )
    
    return stair

def _create_furniture(ifc_file, owner_history, context, storey_placement, furn_data):
    """Create an IfcFurnishingElement from furniture data."""
    pos = furn_data.get('position')
    if not pos:
        return None
    
    x = float(pos.get('x', 0))
    y = float(pos.get('y', 0))
    width = float(furn_data.get('width', 600))
    depth = float(furn_data.get('depth', 600))
    height = float(furn_data.get('height', 750))
    rotation = float(furn_data.get('rotation', 0))
    
    placement = _create_placement_from_point(ifc_file, storey_placement, x, y, 0, rotation)
    
    profile = _create_rectangle_profile(ifc_file, width, depth)
    
    p = ifc_file.createIfcCartesianPoint((0., 0., 0.))
    dz = ifc_file.createIfcDirection((0., 0., 1.))
    dx = ifc_file.createIfcDirection((1., 0., 0.))
    ax = ifc_file.createIfcAxis2Placement3D(p, dz, dx)
    ed = ifc_file.createIfcDirection((0., 0., 1.))
    solid = ifc_file.createIfcExtrudedAreaSolid(profile, ax, ed, float(height))
    
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    furniture = ifc_file.createIfcFurnishingElement(
        generate_guid(), owner_history,
        furn_data.get('name', 'Furniture'), None, None,
        placement, shape, None
    )
    
    return furniture

def _create_space(ifc_file, owner_history, context, storey_placement, room_data):
    """Create an IfcSpace from room data."""
    boundary = room_data.get('boundary', [])
    if len(boundary) < 3:
        return None
    
    # Centroid for placement
    cx = sum(p.get('x', 0) for p in boundary) / len(boundary)
    cy = sum(p.get('y', 0) for p in boundary) / len(boundary)
    
    placement = _create_placement_from_point(ifc_file, storey_placement, 0, 0, 0)
    
    # Create boundary profile from polygon points
    height = float(room_data.get('height', 3000))
    profile_points = [(float(p.get('x', 0)), float(p.get('y', 0))) for p in boundary]
    
    solid = _create_extruded_area_solid(ifc_file, context, profile_points, height)
    body = _create_body_representation(ifc_file, context, solid)
    shape = _create_product_shape(ifc_file, [body])
    
    room_name = room_data.get('name', room_data.get('room_type', 'Room'))
    
    space = ifc_file.createIfcSpace(
        generate_guid(), owner_history,
        room_name, None, None,
        placement, shape, None,
        .ELEMENT., None
    )
    
    area = float(room_data.get('area', 0))
    if area > 0:
        _add_quantity_set(ifc_file, owner_history, space, 'Qto_SpaceBaseQuantities', {
            'GrossFloorArea': area / 1e6,  # mm² → m²
            'Height': height / 1000.0,
        })
    
    return space


# ═══════════════════════════════════════════════════════════════
# Property & Quantity Helpers
# ═══════════════════════════════════════════════════════════════

def _add_property_set(ifc_file, owner_history, element, pset_name, properties):
    """Add a property set to an IFC element."""
    ifc_properties = []
    for name, value in properties.items():
        if isinstance(value, bool):
            prop = ifc_file.createIfcPropertySingleValue(name, None,
                ifc_file.create_entity('IfcBoolean', value), None)
        elif isinstance(value, (int, float)):
            prop = ifc_file.createIfcPropertySingleValue(name, None,
                ifc_file.create_entity('IfcReal', float(value)), None)
        elif isinstance(value, str) and value:
            prop = ifc_file.createIfcPropertySingleValue(name, None,
                ifc_file.create_entity('IfcLabel', value), None)
        else:
            continue
        ifc_properties.append(prop)
    
    if not ifc_properties:
        return
    
    pset = ifc_file.createIfcPropertySet(
        generate_guid(), owner_history, pset_name, None, ifc_properties
    )
    ifc_file.createIfcRelDefinesByProperties(
        generate_guid(), owner_history, None, None, [element], pset
    )

def _add_quantity_set(ifc_file, owner_history, element, qset_name, quantities):
    """Add a quantity set to an IFC element."""
    ifc_quantities = []
    for name, value in quantities.items():
        if 'Area' in name:
            q = ifc_file.createIfcQuantityArea(name, None, None, float(value), None)
        elif 'Volume' in name:
            q = ifc_file.createIfcQuantityVolume(name, None, None, float(value), None)
        elif 'Length' in name or 'Width' in name or 'Height' in name:
            q = ifc_file.createIfcQuantityLength(name, None, None, float(value), None)
        else:
            q = ifc_file.createIfcQuantityLength(name, None, None, float(value), None)
        ifc_quantities.append(q)
    
    if not ifc_quantities:
        return
    
    qset = ifc_file.createIfcElementQuantity(
        generate_guid(), owner_history, qset_name, None, None, ifc_quantities
    )
    ifc_file.createIfcRelDefinesByProperties(
        generate_guid(), owner_history, None, None, [element], qset
    )
