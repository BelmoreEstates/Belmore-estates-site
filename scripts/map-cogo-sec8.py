"""COGO for Legends West Section 8 (lots 801-807) from the signed final plat (LandTech, 2023).
Frame: NAD27 NY State Plane West (EPSG:32017, US ft), as stated in plat Survey Note 1.
Ground distances -> grid by combined factor 0.9999911 (plat note)."""
import math, json
# Usage: imported by scripts/map-build-lots.py (or run directly to print closure checks and areas).
CF=0.9999911
def az(d,m,s): return d+m/60+s/3600
th=az(0,33,55)
AZ_U=360-th          # N 00°33'55" W  (Belmore Way / lot side lines, "north")
AZ_V=90-th           # N 89°26'05" E  (lot cross lines, "east")
def vec(a,dist): r=math.radians(a); return (dist*CF*math.sin(r), dist*CF*math.cos(r))
def add(p,*vs):
    x,y=p
    for v in vs: x+=v[0]; y+=v[1]
    return (x,y)
A=(739201.91,1190677.12)   # plat: NE corner lot 805 (labelled N=1,190,677.12 E=739,201.91)
B_plat=(739200.53,1190287.95)
def P(e,n): # e along v (east +), n along u (north +), relative to A
    return add(A,vec(AZ_V,e),vec(AZ_U,n))
def arc(c,r,a0,a1,n=32):  # azimuths from center (deg), sweep a0->a1
    return [add(c,vec(a0+(a1-a0)*i/n,r)) for i in range(n+1)]
O=P(-365,-326.49)          # common centre of the Belmore Way bend (R150 west ROW, R210 east ROW)
lots={}
lots['805']=[P(0,0),P(-155,0),P(-155,-80),P(0,-80)]
c806=P(-125,-165)
lots['806']=[P(0,-80),P(-155,-80),P(-155,-165)]+arc(c806,30,AZ_V+180,AZ_U-180)[1:]+[P(0,-195)]
# 807: Shelby south ROW (-255) west 125 from the pre-jog east line; jog 5.00 W; east line S 134.14 to B
c807=P(-125,-285)
rad=AZ_V+az(9,52,20)       # radial at end of R210 curve = S 80°41'35" E
e807=add(O,vec(rad,210))
B=add(O,vec(rad,210+155.41))  # plat: 155.41 (lot line); 215.41 incl. 60 ft ROW
lots['807']=[P(-5,-255),P(-125,-255)]+arc(c807,30,AZ_U,AZ_U-90)[1:]+[P(-155,-326.49)]+arc(O,210,AZ_V,rad)[1:]+[B]
lots['804']=[P(-215,0),P(-365,0),P(-365,-80),P(-215,-80)]
lots['803']=[P(-215,-80),P(-365,-80),P(-365,-160),P(-215,-160)]
lots['802']=[P(-215,-160),P(-365,-160),P(-365,-240),P(-215,-240)]
# 801: north line 175.45 from W ROW; west line S18°51'05"W 68.11; SW line S71°08'55"E 202.67 (nonradial) to R150 curve at Δ=17°30'24"
p801=add(O,vec(AZ_V+az(17,30,24),150))
nw=P(-390.45,-240); sw=add(nw,vec(180+az(18,51,5),68.11))
end_sw=add(sw,vec(180-az(71,8,55),202.67))
lots['801']=[P(-215,-240),nw,sw,p801]+arc(O,150,AZ_V+az(17,30,24),AZ_V)[1:-1]+[P(-215,-326.49)]
checks={
 'B_computed_vs_plat_ft': math.dist(B,B_plat),
 'B_via_eastline_vs_plat_ft': math.dist(add(P(-5,-255),vec(180-th,134.14)),B_plat),
 '801_closure_ft': math.dist(end_sw,p801),
}
pts={'A_805NE':A,'B_807SE':B,'centre_O':O,
 'CL_Belmore_x_Shelby':P(-185,-225),'801_NW':nw,'801_SW':sw,'801_SE_on_curve':p801,'804_NW':P(-365,0),'807_SW_on_curve':e807,
 'Belmore_WROW_N':P(-215,0),'Belmore_EROW_N':P(-155,0)}
if __name__=='__main__':
    print(json.dumps(checks,indent=1))
    for k,v in lots.items():
            import shapely.geometry as sg; print(k, round(sg.Polygon(v).area/CF**2,1))
