// Generate sample document files for download
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const files = {
  'structural_foundation.pdf': `
╔══════════════════════════════════════════════════════════════╗
║                  STRUCTURAL DRAWING                         ║
║                  FOUNDATION LAYOUT                          ║
╠══════════════════════════════════════════════════════════════╣
║  Project: Tech Park Phase II / Green Valley Residency       ║
║  Drawing No: STR-FDN-001                                    ║
║  Scale: 1:100                                               ║
║  Standard: IS 456:2000                                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  FOUNDATION DETAILS:                                         ║
║  ─────────────────                                           ║
║  Type: Isolated Footing                                      ║
║  Depth: 1.5m below GL                                        ║
║  Concrete Grade: M25                                         ║
║  Steel Grade: Fe500                                          ║
║                                                              ║
║  FOOTING SCHEDULE:                                           ║
║  ┌──────┬─────────┬───────────┬──────────────────┐           ║
║  │ F1   │ 1.5x1.5 │ 300mm thk │ 8-12mm @ 150 c/c │          ║
║  │ F2   │ 2.0x2.0 │ 350mm thk │ 10-12mm @ 150 c/c│          ║
║  │ F3   │ 1.8x1.8 │ 300mm thk │ 8-12mm @ 150 c/c │          ║
║  │ F4   │ 2.5x2.5 │ 400mm thk │ 12-16mm @ 125 c/c│          ║
║  └──────┴─────────┴───────────┴──────────────────┘           ║
║                                                              ║
║  SOIL DATA:                                                  ║
║  Safe Bearing Capacity: 200 kN/m²                            ║
║  Water Table: 3.5m below GL                                  ║
║  Soil Type: Medium Dense Sand                                ║
║                                                              ║
║  NOTES:                                                      ║
║  1. All dimensions in mm unless noted                        ║
║  2. Cover: 50mm for footing, 40mm for columns                ║
║  3. Lap length: 50d for compression, 55d for tension         ║
║  4. PCC bed: 100mm thick M10 grade                           ║
║                                                              ║
║  Designed by: Structural Engineering Dept                    ║
║  Checked by: Sr. Structural Engineer                         ║
║  Date: January 2025                                          ║
╚══════════════════════════════════════════════════════════════╝
`,

  'arch_ground_floor.pdf': `
╔══════════════════════════════════════════════════════════════╗
║                ARCHITECTURAL PLAN                           ║
║               GROUND FLOOR LAYOUT                           ║
╠══════════════════════════════════════════════════════════════╣
║  Project: Tech Park Phase II / Green Valley Residency       ║
║  Drawing No: ARCH-GF-001                                    ║
║  Scale: 1:100                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ROOM SCHEDULE - GROUND FLOOR:                               ║
║  ┌──────────────────┬──────────┬──────────┐                  ║
║  │ Room             │ Area m²  │ Flooring │                  ║
║  ├──────────────────┼──────────┼──────────┤                  ║
║  │ Reception/Lobby  │ 45.0     │ Marble   │                  ║
║  │ Conference Room  │ 35.0     │ Carpet   │                  ║
║  │ Office Bay 1     │ 120.0    │ Vitrified│                  ║
║  │ Office Bay 2     │ 95.0     │ Vitrified│                  ║
║  │ Server Room      │ 20.0     │ Anti-Stat│                  ║
║  │ Pantry           │ 15.0     │ Ceramic  │                  ║
║  │ Washrooms (M+F)  │ 25.0     │ Anti-Skid│                  ║
║  │ Staircase        │ 18.0     │ Granite  │                  ║
║  │ Lift Lobby       │ 12.0     │ Marble   │                  ║
║  └──────────────────┴──────────┴──────────┘                  ║
║                                                              ║
║  TOTAL BUILT-UP AREA: 385.0 m²                               ║
║  CARPET AREA: 320.0 m²                                       ║
║                                                              ║
║  DOOR SCHEDULE:                                              ║
║  D1: 1200x2100 Double Leaf (Main Entry)                      ║
║  D2: 900x2100 Single Leaf (Internal)                         ║
║  D3: 750x2100 Toilet Door                                    ║
║                                                              ║
║  WINDOW SCHEDULE:                                            ║
║  W1: 1800x1500 Sliding (Office Bay)                          ║
║  W2: 1200x1200 Casement (Washroom)                           ║
║  W3: 900x600 Ventilator                                      ║
║                                                              ║
║  Architect: Design Studio                                    ║
║  Date: January 2025                                          ║
╚══════════════════════════════════════════════════════════════╝
`,

  'boq_detailed.xlsx': `
╔══════════════════════════════════════════════════════════════════════════╗
║                    BILL OF QUANTITIES                                   ║
║               DETAILED ESTIMATION REPORT                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  S.No │ Item Description          │ Unit  │ Qty    │ Rate ₹  │ Amount ₹ ║
║  ─────┼───────────────────────────┼───────┼────────┼─────────┼──────────║
║  1.0  │ EARTHWORK                 │       │        │         │          ║
║  1.1  │ Excavation in soil        │ m³    │ 450    │ 280     │ 1,26,000 ║
║  1.2  │ Sand filling              │ m³    │ 120    │ 1,200   │ 1,44,000 ║
║  1.3  │ Anti-termite treatment    │ m²    │ 385    │ 45      │ 17,325   ║
║       │                           │       │        │         │          ║
║  2.0  │ CONCRETE WORK             │       │        │         │          ║
║  2.1  │ PCC M10 - 100mm bed       │ m³    │ 38.5   │ 4,500   │ 1,73,250 ║
║  2.2  │ RCC M25 - Foundation      │ m³    │ 85     │ 7,200   │ 6,12,000 ║
║  2.3  │ RCC M25 - Columns         │ m³    │ 42     │ 8,500   │ 3,57,000 ║
║  2.4  │ RCC M25 - Beams           │ m³    │ 65     │ 8,000   │ 5,20,000 ║
║  2.5  │ RCC M25 - Slabs           │ m³    │ 96     │ 7,800   │ 7,48,800 ║
║       │                           │       │        │         │          ║
║  3.0  │ STEEL REINFORCEMENT       │       │        │         │          ║
║  3.1  │ TMT Fe500 bars            │ MT    │ 28     │ 58,000  │16,24,000 ║
║       │                           │       │        │         │          ║
║  4.0  │ BRICKWORK                 │       │        │         │          ║
║  4.1  │ 230mm thick CM 1:6        │ m²    │ 850    │ 1,100   │ 9,35,000 ║
║  4.2  │ 115mm thick CM 1:4        │ m²    │ 320    │ 650     │ 2,08,000 ║
║       │                           │       │        │         │          ║
║  5.0  │ PLASTERING                │       │        │         │          ║
║  5.1  │ Internal 12mm CM 1:6      │ m²    │ 2,400  │ 180     │ 4,32,000 ║
║  5.2  │ External 20mm CM 1:4      │ m²    │ 1,200  │ 250     │ 3,00,000 ║
║       │                           │       │        │         │          ║
║  6.0  │ FLOORING                  │       │        │         │          ║
║  6.1  │ Vitrified tiles 600x600   │ m²    │ 320    │ 950     │ 3,04,000 ║
║  6.2  │ Marble flooring           │ m²    │ 57     │ 2,200   │ 1,25,400 ║
║  ─────┼───────────────────────────┼───────┼────────┼─────────┼──────────║
║       │ GRAND TOTAL               │       │        │         │68,26,775 ║
╚══════════════════════════════════════════════════════════════════════════╝
`,

  'soil_test_report.pdf': `
╔══════════════════════════════════════════════════════════════╗
║                    SOIL TEST REPORT                         ║
║              GEOTECHNICAL INVESTIGATION                     ║
╠══════════════════════════════════════════════════════════════╣
║  Project: Tech Park Phase II                                ║
║  Location: Coimbatore, Tamil Nadu                           ║
║  Report No: GEO-2024-0847                                   ║
║  Date: December 2024                                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  BOREHOLE DATA:                                              ║
║  ┌──────────┬──────────────────┬────────┬─────────┐          ║
║  │ Depth(m) │ Soil Description │ N-Value│ Remarks │          ║
║  ├──────────┼──────────────────┼────────┼─────────┤          ║
║  │ 0.0-0.5  │ Top Soil         │ -      │ Loose   │          ║
║  │ 0.5-1.5  │ Silty Sand       │ 8      │ Loose   │          ║
║  │ 1.5-3.0  │ Medium Sand      │ 18     │ Medium  │          ║
║  │ 3.0-5.0  │ Dense Sand       │ 32     │ Dense   │          ║
║  │ 5.0-7.5  │ Weathered Rock   │ 50+    │ Refusal │          ║
║  └──────────┴──────────────────┴────────┴─────────┘          ║
║                                                              ║
║  RECOMMENDATIONS:                                            ║
║  • Safe Bearing Capacity: 200 kN/m² at 1.5m depth           ║
║  • Foundation Type: Isolated Footing recommended             ║
║  • Water Table: 3.5m below ground level                      ║
║  • Seismic Zone: III (IS 1893)                               ║
║  • Liquefaction Potential: Low                               ║
║                                                              ║
║  LABORATORY TEST RESULTS:                                    ║
║  Liquid Limit: 28%                                           ║
║  Plastic Limit: 18%                                          ║
║  Plasticity Index: 10                                        ║
║  Specific Gravity: 2.65                                      ║
║  Grain Size: Well-graded sand (SW)                           ║
║                                                              ║
║  Tested by: ABC Geotechnical Labs                            ║
║  Approved by: Chief Geotechnical Engineer                    ║
╚══════════════════════════════════════════════════════════════╝
`,

  'rera_certificate.pdf': `
╔══════════════════════════════════════════════════════════════╗
║         REAL ESTATE REGULATORY AUTHORITY                    ║
║              REGISTRATION CERTIFICATE                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  RERA Registration No: TN/02/PR/2024/0583                    ║
║                                                              ║
║  Project Name: Tech Park Phase II                            ║
║  Promoter: InfoTech Holdings Pvt Ltd                         ║
║  Location: Coimbatore, Tamil Nadu                            ║
║  Type: Commercial IT Park                                    ║
║  Total Area: 2.5 Acres                                       ║
║  Built-up Area: 50,000 sq.ft                                 ║
║                                                              ║
║  Registration Date: 10 January 2024                          ║
║  Valid Until: 31 March 2027                                  ║
║  Completion Date: 31 March 2025 (Extended)                   ║
║                                                              ║
║  BANK DETAILS:                                               ║
║  Escrow Account: HDFC Bank, Coimbatore Branch                ║
║  Account No: 50200XXXXXX829                                  ║
║                                                              ║
║  This certificate is issued under Section 5 of               ║
║  the Real Estate (Regulation and Development)                ║
║  Act, 2016.                                                  ║
║                                                              ║
║  Issued by: Tamil Nadu RERA Authority                        ║
║  Digital Signature: Verified                                 ║
╚══════════════════════════════════════════════════════════════╝
`,

  'building_permit.pdf': `
╔══════════════════════════════════════════════════════════════╗
║           MUNICIPAL CORPORATION OF COIMBATORE               ║
║               BUILDING PERMIT / APPROVAL                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Permit No: CBE/BP/2024/1247                                 ║
║  Date of Issue: 05 January 2024                              ║
║                                                              ║
║  Owner: InfoTech Holdings Pvt Ltd                            ║
║  Architect: Design Studio Associates                         ║
║  Structural Engineer: KEC Structural Consultants             ║
║                                                              ║
║  APPROVED PARAMETERS:                                        ║
║  ┌─────────────────────────┬──────────────────┐              ║
║  │ Plot Area               │ 10,890 sq.ft     │              ║
║  │ Ground Coverage         │ 55%              │              ║
║  │ FSI Allowed             │ 2.5              │              ║
║  │ FSI Utilized            │ 2.3              │              ║
║  │ No. of Floors           │ G + 4            │              ║
║  │ Building Height         │ 18.0m            │              ║
║  │ Setback (Front)         │ 6.0m             │              ║
║  │ Setback (Rear)          │ 3.0m             │              ║
║  │ Setback (Sides)         │ 3.0m each        │              ║
║  │ Parking Spaces          │ 45               │              ║
║  └─────────────────────────┴──────────────────┘              ║
║                                                              ║
║  CONDITIONS:                                                 ║
║  1. Rainwater harvesting mandatory                           ║
║  2. STP for sewage treatment                                 ║
║  3. Solar panels on rooftop (min 50%)                        ║
║  4. Fire NOC required before occupation                      ║
║                                                              ║
║  Approved by: Town Planning Department                       ║
║  Commissioner: Municipal Corporation Coimbatore              ║
╚══════════════════════════════════════════════════════════════╝
`,

  'electrical_layout.pdf': `
╔══════════════════════════════════════════════════════════════╗
║                 ELECTRICAL LAYOUT                           ║
║              GROUND FLOOR WIRING PLAN                       ║
╠══════════════════════════════════════════════════════════════╣
║  Drawing No: ELEC-GF-001     Standard: IS 732               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  LOAD SCHEDULE:                                              ║
║  ┌────────────────────┬──────┬────────┬────────┬──────┐      ║
║  │ Circuit            │ Load │ Cable  │ MCB    │ Pts  │      ║
║  ├────────────────────┼──────┼────────┼────────┼──────┤      ║
║  │ Lighting - Bay 1   │ 1.2kW│ 1.5mm² │ 6A     │ 18   │      ║
║  │ Lighting - Bay 2   │ 0.9kW│ 1.5mm² │ 6A     │ 14   │      ║
║  │ Power - Bay 1      │ 3.0kW│ 4mm²   │ 16A    │ 12   │      ║
║  │ Power - Bay 2      │ 2.5kW│ 4mm²   │ 16A    │ 10   │      ║
║  │ AC Circuit         │ 7.2kW│ 6mm²   │ 32A    │ 4    │      ║
║  │ Server Room UPS    │ 5.0kW│ 6mm²   │ 32A    │ 8    │      ║
║  │ Kitchen/Pantry     │ 3.0kW│ 4mm²   │ 20A    │ 6    │      ║
║  │ External Lighting  │ 0.8kW│ 2.5mm² │ 6A     │ 8    │      ║
║  └────────────────────┴──────┴────────┴────────┴──────┘      ║
║                                                              ║
║  MAIN PANEL: 100A TPN MCCB                                  ║
║  Total Connected Load: 23.6 kW                               ║
║  Demand Load (0.6 DF): 14.2 kW                              ║
║  Main Cable: 3x25mm² + 1x16mm² Cu XLPE                      ║
║  Earthing: 2 Nos GI Pipe Electrode (IS 3043)                ║
║                                                              ║
║  Designed by: MEP Engineering Dept                           ║
╚══════════════════════════════════════════════════════════════╝
`,

  'plumbing_layout.pdf': `
╔══════════════════════════════════════════════════════════════╗
║                  PLUMBING LAYOUT                            ║
║           WATER SUPPLY & DRAINAGE PLAN                      ║
╠══════════════════════════════════════════════════════════════╣
║  Drawing No: PLB-001          Standard: IS 2065             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  FIXTURE SCHEDULE:                                           ║
║  ┌──────────────────┬─────┬──────────┬──────────┐            ║
║  │ Fixture          │ Qty │ Supply FU│ Drain FU │            ║
║  ├──────────────────┼─────┼──────────┼──────────┤            ║
║  │ WC (flush valve) │ 8   │ 48       │ 32       │            ║
║  │ Wash Basin       │ 10  │ 10       │ 10       │            ║
║  │ Urinal           │ 4   │ 12       │ 16       │            ║
║  │ Kitchen Sink     │ 2   │ 4        │ 6        │            ║
║  │ Floor Trap       │ 6   │ -        │ 6        │            ║
║  │ Drinking Water   │ 3   │ 3        │ 3        │            ║
║  └──────────────────┴─────┴──────────┴──────────┘            ║
║                                                              ║
║  PIPE SIZING:                                                ║
║  Main Supply Riser: 50mm GI pipe                             ║
║  Branch Supply: 25mm CPVC                                    ║
║  Main Soil Stack: 110mm PVC                                  ║
║  Waste Stack: 75mm PVC                                       ║
║  Vent Stack: 75mm PVC                                        ║
║                                                              ║
║  WATER STORAGE:                                              ║
║  Overhead Tank: 10,000 liters (FRP)                          ║
║  Underground Sump: 20,000 liters (RCC)                       ║
║  Pump: 2HP Submersible (1 working + 1 standby)               ║
║                                                              ║
║  Designed by: MEP Engineering Dept                           ║
╚══════════════════════════════════════════════════════════════╝
`,
};

let count = 0;
for (const [filename, content] of Object.entries(files)) {
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, content.trim(), 'utf8');
  count++;
  console.log(`  ✓ Created: ${filename}`);
}
console.log(`\n✅ ${count} sample files created in ${uploadsDir}`);
