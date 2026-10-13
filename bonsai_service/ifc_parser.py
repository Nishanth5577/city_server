"""
IFC Parser — Extracts structured data from IFC files for use in BIM Design Studio.
Parses spatial hierarchy, entities, properties, quantities, and provides
data in JSON-serializable format.
"""
import ifcopenshell
import ifcopenshell.util.element
import math
import json

def parse_ifc_file(file_path):
    """
    Parse an IFC file and extract structured data.
    Returns a dictionary with spatial hierarchy, entity counts, properties, and element data.
    """
    ifc_file = ifcopenshell.open(file_path)
    
    result = {
        'schema': ifc_file.schema,
        'header': _parse_header(ifc_file),
        'spatial_tree': _build_spatial_tree(ifc_file),
        'entity_summary': _count_entities(ifc_file),
        'elements': _extract_elements(ifc_file),
        'property_sets': _extract_global_property_sets(ifc_file),
        'total_entities': len(list(ifc_file)),
    }
    
    return result

def parse_ifc_to_studio_elements(file_path):
    """
    Parse an IFC file and convert entities into BIM Design Studio element format.
    This enables importing IFC files into the editor for round-trip editing.
    """
    ifc_file = ifcopenshell.open(file_path)
    
    elements = {
        'walls': [],
        'columns': [],
        'beams': [],
        'doors': [],
        'windows': [],
        'stairs': [],
        'furniture': [],
        'rooms': [],
    }
    
    # Extract walls
    for wall in ifc_file.by_type('IfcWall'):
        wall_data = _extract_wall_data(wall)
        if wall_data:
            elements['walls'].append(wall_data)
    
    # Also check IfcWallStandardCase
    for wall in ifc_file.by_type('IfcWallStandardCase'):
        wall_data = _extract_wall_data(wall)
        if wall_data:
            # Avoid duplicates (IfcWallStandardCase is subtype of IfcWall)
            if not any(w.get('ifc_guid') == wall_data.get('ifc_guid') for w in elements['walls']):
                elements['walls'].append(wall_data)
    
    # Extract columns
    for col in ifc_file.by_type('IfcColumn'):
        col_data = _extract_column_data(col)
        if col_data:
            elements['columns'].append(col_data)
    
    # Extract beams
    for beam in ifc_file.by_type('IfcBeam'):
        beam_data = _extract_beam_data(beam)
        if beam_data:
            elements['beams'].append(beam_data)
    
    # Extract doors
    for door in ifc_file.by_type('IfcDoor'):
        door_data = _extract_door_data(door)
        if door_data:
            elements['doors'].append(door_data)
    
    # Extract windows
    for window in ifc_file.by_type('IfcWindow'):
        win_data = _extract_window_data(window)
        if win_data:
            elements['windows'].append(win_data)
    
    # Extract stairs
    for stair in ifc_file.by_type('IfcStairFlight'):
        stair_data = _extract_stair_data(stair)
        if stair_data:
            elements['stairs'].append(stair_data)
    
    # Extract furniture
    for furn in ifc_file.by_type('IfcFurnishingElement'):
        furn_data = _extract_furniture_data(furn)
        if furn_data:
            elements['furniture'].append(furn_data)
    
    # Extract spaces (rooms)
    for space in ifc_file.by_type('IfcSpace'):
        space_data = _extract_space_data(space)
        if space_data:
            elements['rooms'].append(space_data)
    
    # Build floor structure
    storeys = []
    for storey in ifc_file.by_type('IfcBuildingStorey'):
        storey_info = {
            'ifc_guid': storey.GlobalId,
            'floor_name': storey.Name or f'Level {storey.Elevation or 0}',
            'floor_number': _get_storey_number(storey),
            'floor_height': float(storey.Elevation or 0),
            'elements': _get_elements_in_storey(ifc_file, storey, elements),
        }
        storeys.append(storey_info)
    
    # Build building structure
    buildings = []
    for building in ifc_file.by_type('IfcBuilding'):
        building_info = {
            'ifc_guid': building.GlobalId,
            'name': building.Name or 'Building',
            'floors': [s for s in storeys if _is_storey_in_building(ifc_file, s, building)],
        }
        buildings.append(building_info)
    
    # If no building structure, create a default one
    if not buildings and storeys:
        buildings = [{'name': 'Building', 'floors': storeys}]
    elif not buildings and not storeys:
        buildings = [{'name': 'Building', 'floors': [{'floor_name': 'Ground Floor', 'floor_number': 0, 'floor_height': 0, 'elements': elements}]}]
    
    return {
        'buildings': buildings,
        'all_elements': elements,
        'total_elements': sum(len(v) for v in elements.values()),
    }


# ═══════════════════════════════════════════════════════════════
# Header & Structure Parsing
# ═══════════════════════════════════════════════════════════════

def _parse_header(ifc_file):
    """Extract header metadata."""
    header = {}
    try:
        header['schema'] = ifc_file.schema
        # Try to get header info from the wrapped file
        header['description'] = str(getattr(ifc_file, 'header', {}).get('file_description', ''))
        header['file_name'] = str(getattr(ifc_file, 'header', {}).get('file_name', ''))
    except Exception:
        pass
    return header

def _build_spatial_tree(ifc_file):
    """Build a hierarchical spatial structure tree."""
    tree = []
    
    for project in ifc_file.by_type('IfcProject'):
        project_node = {
            'type': 'IfcProject',
            'guid': project.GlobalId,
            'name': project.Name or 'Project',
            'children': [],
        }
        
        for site in _get_decomposed_by(ifc_file, project):
            if site.is_a('IfcSite'):
                site_node = {
                    'type': 'IfcSite',
                    'guid': site.GlobalId,
                    'name': site.Name or 'Site',
                    'children': [],
                }
                
                for building in _get_decomposed_by(ifc_file, site):
                    if building.is_a('IfcBuilding'):
                        building_node = {
                            'type': 'IfcBuilding',
                            'guid': building.GlobalId,
                            'name': building.Name or 'Building',
                            'children': [],
                        }
                        
                        for storey in _get_decomposed_by(ifc_file, building):
                            if storey.is_a('IfcBuildingStorey'):
                                storey_node = {
                                    'type': 'IfcBuildingStorey',
                                    'guid': storey.GlobalId,
                                    'name': storey.Name or 'Level',
                                    'elevation': float(storey.Elevation or 0),
                                    'element_count': len(_get_contained_elements(ifc_file, storey)),
                                }
                                building_node['children'].append(storey_node)
                        
                        site_node['children'].append(building_node)
                
                project_node['children'].append(site_node)
        
        tree.append(project_node)
    
    return tree

def _get_decomposed_by(ifc_file, parent):
    """Get entities decomposed by the parent via IfcRelAggregates."""
    results = []
    for rel in ifc_file.by_type('IfcRelAggregates'):
        if rel.RelatingObject == parent:
            results.extend(rel.RelatedObjects)
    return results

def _get_contained_elements(ifc_file, spatial_element):
    """Get elements contained in a spatial structure element."""
    elements = []
    for rel in ifc_file.by_type('IfcRelContainedInSpatialStructure'):
        if rel.RelatingStructure == spatial_element:
            elements.extend(rel.RelatedElements)
    return elements

def _count_entities(ifc_file):
    """Count entities by type."""
    counts = {}
    for entity in ifc_file:
        entity_type = entity.is_a()
        counts[entity_type] = counts.get(entity_type, 0) + 1
    
    # Sort by count descending
    return dict(sorted(counts.items(), key=lambda x: -x[1]))


# ═══════════════════════════════════════════════════════════════
# Element Data Extraction
# ═══════════════════════════════════════════════════════════════

def _get_placement_coords(element):
    """Extract XYZ coordinates from an element's placement."""
    try:
        placement = element.ObjectPlacement
        if placement and placement.is_a('IfcLocalPlacement'):
            rel_placement = placement.RelativePlacement
            if rel_placement and rel_placement.is_a('IfcAxis2Placement3D'):
                loc = rel_placement.Location
                if loc:
                    coords = loc.Coordinates
                    return {'x': float(coords[0]), 'y': float(coords[1]), 'z': float(coords[2]) if len(coords) > 2 else 0}
    except Exception:
        pass
    return {'x': 0, 'y': 0, 'z': 0}

def _get_element_properties(element):
    """Get all property sets for an element."""
    props = {}
    try:
        for rel in element.IsDefinedBy:
            if rel.is_a('IfcRelDefinesByProperties'):
                pset = rel.RelatingPropertyDefinition
                if pset.is_a('IfcPropertySet'):
                    pset_props = {}
                    for prop in pset.HasProperties:
                        if prop.is_a('IfcPropertySingleValue'):
                            val = prop.NominalValue
                            pset_props[prop.Name] = val.wrappedValue if val else None
                    props[pset.Name] = pset_props
                elif pset.is_a('IfcElementQuantity'):
                    qset_props = {}
                    for q in pset.Quantities:
                        if hasattr(q, 'LengthValue'):
                            qset_props[q.Name] = float(q.LengthValue)
                        elif hasattr(q, 'AreaValue'):
                            qset_props[q.Name] = float(q.AreaValue)
                        elif hasattr(q, 'VolumeValue'):
                            qset_props[q.Name] = float(q.VolumeValue)
                    props[pset.Name] = qset_props
    except Exception:
        pass
    return props

def _extract_wall_data(wall):
    """Extract wall data in BIM Studio format."""
    coords = _get_placement_coords(wall)
    properties = _get_element_properties(wall)
    
    # Try to get wall dimensions from quantities or geometry
    wall_props = properties.get('Qto_WallBaseQuantities', {})
    pset = properties.get('Pset_WallCommon', {})
    
    length = wall_props.get('Length', 3) * 1000  # m → mm
    height = wall_props.get('Height', 3) * 1000
    thickness = wall_props.get('Width', 0.23) * 1000
    
    return {
        'ifc_guid': wall.GlobalId,
        'name': wall.Name or 'Wall',
        'wall_type': pset.get('Reference', 'exterior' if pset.get('IsExternal') else 'interior'),
        'start_point': {'x': coords['x'], 'y': coords['y']},
        'end_point': {'x': coords['x'] + length, 'y': coords['y']},
        'thickness': thickness,
        'height': height,
        'properties': properties,
    }

def _extract_column_data(col):
    """Extract column data in BIM Studio format."""
    coords = _get_placement_coords(col)
    return {
        'ifc_guid': col.GlobalId,
        'name': col.Name or 'Column',
        'position': {'x': coords['x'], 'y': coords['y']},
        'width': 300,
        'depth': 300,
        'height': 3000,
        'shape': 'rectangular',
        'properties': _get_element_properties(col),
    }

def _extract_beam_data(beam):
    """Extract beam data in BIM Studio format."""
    coords = _get_placement_coords(beam)
    return {
        'ifc_guid': beam.GlobalId,
        'name': beam.Name or 'Beam',
        'position': {'x': coords['x'], 'y': coords['y']},
        'width': 230,
        'depth': 450,
        'length': 3000,
        'properties': _get_element_properties(beam),
    }

def _extract_door_data(door):
    """Extract door data in BIM Studio format."""
    coords = _get_placement_coords(door)
    return {
        'ifc_guid': door.GlobalId,
        'name': door.Name or 'Door',
        'position': {'x': coords['x'], 'y': coords['y']},
        'width': float(door.OverallWidth or 900),
        'height': float(door.OverallHeight or 2100),
        'door_type': 'single',
        'properties': _get_element_properties(door),
    }

def _extract_window_data(window):
    """Extract window data in BIM Studio format."""
    coords = _get_placement_coords(window)
    return {
        'ifc_guid': window.GlobalId,
        'name': window.Name or 'Window',
        'position': {'x': coords['x'], 'y': coords['y']},
        'width': float(window.OverallWidth or 1200),
        'height': float(window.OverallHeight or 1200),
        'sill_height': coords.get('z', 900),
        'window_type': 'casement',
        'properties': _get_element_properties(window),
    }

def _extract_stair_data(stair):
    """Extract stair data in BIM Studio format."""
    coords = _get_placement_coords(stair)
    return {
        'ifc_guid': stair.GlobalId,
        'name': stair.Name or 'Stair',
        'position': {'x': coords['x'], 'y': coords['y']},
        'width': 1200,
        'num_risers': int(stair.NumberOfRisers or 18),
        'riser_height': float(stair.RiserHeight or 167),
        'tread_depth': float(stair.TreadLength or 270),
        'total_height': float((stair.NumberOfRisers or 18) * (stair.RiserHeight or 167)),
        'stair_type': 'straight',
        'properties': _get_element_properties(stair),
    }

def _extract_furniture_data(furn):
    """Extract furniture data in BIM Studio format."""
    coords = _get_placement_coords(furn)
    return {
        'ifc_guid': furn.GlobalId,
        'name': furn.Name or 'Furniture',
        'position': {'x': coords['x'], 'y': coords['y']},
        'width': 600,
        'depth': 600,
        'height': 750,
        'category': 'other',
        'properties': _get_element_properties(furn),
    }

def _extract_space_data(space):
    """Extract room/space data in BIM Studio format."""
    coords = _get_placement_coords(space)
    properties = _get_element_properties(space)
    qset = properties.get('Qto_SpaceBaseQuantities', {})
    
    return {
        'ifc_guid': space.GlobalId,
        'name': space.Name or space.LongName or 'Room',
        'room_type': (space.Name or 'room').lower().replace(' ', '_'),
        'boundary': [],  # Would need geometry extraction for full boundary
        'area': qset.get('GrossFloorArea', 0) * 1e6,  # m² → mm²
        'height': qset.get('Height', 3) * 1000,  # m → mm
        'properties': properties,
    }

def _extract_elements(ifc_file):
    """Extract summary of all building elements."""
    element_types = [
        'IfcWall', 'IfcWallStandardCase', 'IfcColumn', 'IfcBeam',
        'IfcDoor', 'IfcWindow', 'IfcStairFlight', 'IfcStair',
        'IfcSlab', 'IfcRoof', 'IfcSpace', 'IfcFurnishingElement',
        'IfcPlate', 'IfcRailing', 'IfcRamp', 'IfcCovering',
    ]
    
    elements = {}
    for etype in element_types:
        entities = ifc_file.by_type(etype)
        if entities:
            elements[etype] = [{
                'guid': e.GlobalId,
                'name': e.Name or etype,
                'description': e.Description or '',
            } for e in entities]
    
    return elements

def _extract_global_property_sets(ifc_file):
    """Extract all unique property set definitions."""
    psets = {}
    for pset in ifc_file.by_type('IfcPropertySet'):
        if pset.Name not in psets:
            prop_names = []
            for prop in (pset.HasProperties or []):
                if prop.is_a('IfcPropertySingleValue'):
                    prop_names.append(prop.Name)
            psets[pset.Name] = {'count': 1, 'properties': prop_names}
        else:
            psets[pset.Name]['count'] += 1
    return psets


# ═══════════════════════════════════════════════════════════════
# Spatial Helpers
# ═══════════════════════════════════════════════════════════════

def _get_storey_number(storey):
    """Infer storey number from elevation or name."""
    try:
        elev = float(storey.Elevation or 0)
        if elev == 0:
            return 0
        return int(round(elev / 3000))  # Assume ~3m floor height
    except Exception:
        return 0

def _get_elements_in_storey(ifc_file, storey_info, all_elements):
    """Get elements that belong to a specific storey."""
    # For now, return all elements (proper assignment requires spatial containment analysis)
    return all_elements

def _is_storey_in_building(ifc_file, storey_info, building):
    """Check if a storey belongs to a building."""
    for rel in ifc_file.by_type('IfcRelAggregates'):
        if rel.RelatingObject == building:
            for obj in rel.RelatedObjects:
                if hasattr(obj, 'GlobalId') and obj.GlobalId == storey_info.get('ifc_guid'):
                    return True
    return False


# ═══════════════════════════════════════════════════════════════
# IFC Validation
# ═══════════════════════════════════════════════════════════════

def validate_ifc_file(file_path):
    """Validate an IFC file and return errors/warnings."""
    errors = []
    warnings = []
    
    try:
        ifc_file = ifcopenshell.open(file_path)
    except Exception as e:
        return {'is_valid': False, 'errors': [f'Cannot open IFC file: {str(e)}'], 'warnings': []}
    
    # Check schema
    if ifc_file.schema not in ('IFC2X3', 'IFC4', 'IFC4X3'):
        warnings.append(f'Unusual schema: {ifc_file.schema}')
    
    # Check project exists
    projects = ifc_file.by_type('IfcProject')
    if not projects:
        errors.append('No IfcProject found')
    elif len(projects) > 1:
        errors.append('Multiple IfcProject instances found')
    
    # Check spatial hierarchy
    sites = ifc_file.by_type('IfcSite')
    if not sites:
        warnings.append('No IfcSite found')
    
    buildings = ifc_file.by_type('IfcBuilding')
    if not buildings:
        warnings.append('No IfcBuilding found')
    
    storeys = ifc_file.by_type('IfcBuildingStorey')
    if not storeys:
        warnings.append('No IfcBuildingStorey found')
    
    # Check for orphaned elements (not contained in spatial structure)
    contained_elements = set()
    for rel in ifc_file.by_type('IfcRelContainedInSpatialStructure'):
        for el in rel.RelatedElements:
            contained_elements.add(el.id())
    
    building_elements = ifc_file.by_type('IfcBuildingElement')
    orphaned = [e for e in building_elements if e.id() not in contained_elements]
    if orphaned:
        warnings.append(f'{len(orphaned)} building elements not assigned to any storey')
    
    # Check for elements without geometry
    no_geom = []
    for el in building_elements:
        if not el.Representation:
            no_geom.append(el.Name or el.is_a())
    if no_geom:
        warnings.append(f'{len(no_geom)} elements have no geometry representation')
    
    # Check GUIDs are unique
    guids = {}
    for entity in ifc_file:
        if hasattr(entity, 'GlobalId'):
            guid = entity.GlobalId
            if guid in guids:
                errors.append(f'Duplicate GUID: {guid} ({entity.is_a()} and {guids[guid]})')
            else:
                guids[guid] = entity.is_a()
    
    return {
        'is_valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'entity_count': len(list(ifc_file)),
        'schema': ifc_file.schema,
    }

def get_ifc_quantity_takeoff(file_path):
    """Extract quantity takeoff data from an IFC file."""
    ifc_file = ifcopenshell.open(file_path)
    
    takeoff = {
        'walls': {'count': 0, 'total_length_m': 0, 'total_area_sqm': 0, 'total_volume_cum': 0},
        'columns': {'count': 0, 'total_volume_cum': 0},
        'beams': {'count': 0, 'total_length_m': 0},
        'doors': {'count': 0, 'by_type': {}},
        'windows': {'count': 0, 'by_type': {}},
        'slabs': {'count': 0, 'total_area_sqm': 0, 'total_volume_cum': 0},
        'stairs': {'count': 0},
        'spaces': {'count': 0, 'total_area_sqm': 0},
        'furniture': {'count': 0},
    }
    
    # Process walls
    for wall in ifc_file.by_type('IfcWall'):
        takeoff['walls']['count'] += 1
        props = _get_element_properties(wall)
        qset = props.get('Qto_WallBaseQuantities', {})
        takeoff['walls']['total_length_m'] += qset.get('Length', 0)
        takeoff['walls']['total_area_sqm'] += qset.get('GrossSideArea', 0)
        takeoff['walls']['total_volume_cum'] += qset.get('GrossVolume', 0)
    
    # Process columns
    for col in ifc_file.by_type('IfcColumn'):
        takeoff['columns']['count'] += 1
    
    # Process beams
    for beam in ifc_file.by_type('IfcBeam'):
        takeoff['beams']['count'] += 1
    
    # Process doors
    for door in ifc_file.by_type('IfcDoor'):
        takeoff['doors']['count'] += 1
    
    # Process windows
    for window in ifc_file.by_type('IfcWindow'):
        takeoff['windows']['count'] += 1
    
    # Process slabs
    for slab in ifc_file.by_type('IfcSlab'):
        takeoff['slabs']['count'] += 1
    
    # Process stairs
    for stair in ifc_file.by_type('IfcStairFlight'):
        takeoff['stairs']['count'] += 1
    
    # Process spaces
    for space in ifc_file.by_type('IfcSpace'):
        takeoff['spaces']['count'] += 1
        props = _get_element_properties(space)
        qset = props.get('Qto_SpaceBaseQuantities', {})
        takeoff['spaces']['total_area_sqm'] += qset.get('GrossFloorArea', 0)
    
    # Process furniture
    for furn in ifc_file.by_type('IfcFurnishingElement'):
        takeoff['furniture']['count'] += 1
    
    return takeoff
