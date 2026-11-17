import copy
MIX={5.5:0.56,6.5:0.37,9.5:0.06,14.5:0.01}
PRECIO=sum(p*w for p,w in MIX.items())  # €/com/mes con +0,50 incluido
def tier_comm(x,cap=2000):
    c=0.12*min(x,3000)+0.05*max(0,min(x,20000)-3000)+0.02*max(0,x-20000)
    return min(c,cap)
BASE=dict(nuevos_mes=3, fundadores=5, paquete=50, dto_fund=0.30, dto_todos=False, alta=290,
  activ=[0.3,0.7,0.9],          # % comunidades activas mes de alta, +1, +2 en adelante
  averias=4, ticket=250, pct_red=0.15, com_red=0.12,
  concursos=0.06, pct_conc=0.25, ticket_obra=35000, lag_obra=6,
  pros_desp=12, conv=0.10, inicio_niv=4, mix_niv=(0.6,0.3,0.1), cuotas=(29,75,180),
  fijo=90+100+120+50+100+150+320,  # infra, Claude dev, gestoria, seguro RC, legal, ventas, RETA
  var_com=0.05, var_aver=0.45, pct_pago=0.015, connect=2.0, tax=0.15)
def run(P):
    filas=[]
    for m in range(1,13):
        altas=[P['fundadores'] if k==1 else P['nuevos_mes'] for k in range(1,m+1)]
        n_desp=sum(altas)
        cuota=alta=0; com_act=0; com_pag=0; obras=0
        for k,a in enumerate(altas,1):
            edad=m-k
            if edad==0: alta+=a*P['alta']
            fund=(k==1) or P['dto_todos']
            precio=PRECIO*(1-P['dto_fund'] if fund else 1)
            if edad>=1:
                cuota+=a*P['paquete']*precio; com_pag+=a*P['paquete']
            act=a*P['paquete']*P['activ'][min(edad,2)]
            com_act+=act
            if edad>=P['lag_obra']: obras+=act*P['concursos']/12*P['pct_conc']
        aver=com_act*P['averias']/12
        red=aver*P['pct_red']*P['ticket']*P['com_red']
        obra_com=obras*tier_comm(P['ticket_obra'])
        subs=0
        if m>=P['inicio_niv']:
            subs=n_desp*P['pros_desp']*P['conv']
        arpu=sum(w*c for w,c in zip(P['mix_niv'],P['cuotas']))
        niv=subs*arpu
        ingreso=cuota+alta+red+obra_com+niv
        pros_activos=subs+aver*P['pct_red']*0.6
        coste=P['fijo']+com_act*P['var_com']+aver*P['var_aver']+ingreso*P['pct_pago']+pros_activos*P['connect']
        filas.append(dict(m=m,desp=n_desp,com_pag=com_pag,cuota=cuota,alta=alta,red=red,obra=obra_com,niv=niv,
             subs=subs,ing=ingreso,coste=coste,ebt=ingreso-coste))
    ebt=sum(f['ebt'] for f in filas); tax=max(0,ebt)*P['tax']
    neto=ebt-tax
    return filas,neto/12,filas[-1]['ebt']*(1-P['tax'])
def resumen(nombre,P):
    f,media,m12=run(P)
    avg=lambda k: sum(x[k] for x in f)/12
    t=1-P['tax']
    print(f"{nombre:22s} desp12={f[-1]['desp']} subs12={f[-1]['subs']:.0f} | MEDIA: cuota+alta {avg('cuota')+avg('alta'):7.0f} red {avg('red'):5.0f} obras {avg('obra'):5.0f} niveles {avg('niv'):5.0f} costes {avg('coste'):5.0f} NETO {media:7.0f} | M12: cuota {f[-1]['cuota']+f[-1]['alta']:6.0f} red {f[-1]['red']:5.0f} obras {f[-1]['obra']:5.0f} niv {f[-1]['niv']:5.0f} costes {f[-1]['coste']:5.0f} NETO {m12:6.0f}")
    return f,media,m12
PES=dict(BASE,nuevos_mes=2,averias=3,ticket=200,pct_red=0.08,concursos=0.03,pct_conc=0.15,lag_obra=9,pros_desp=8,conv=0.05,cuotas=(19,49,119),activ=[0.2,0.5,0.75])
OPT=dict(BASE,nuevos_mes=4,averias=6,ticket=350,pct_red=0.25,concursos=0.10,pct_conc=0.40,lag_obra=4,pros_desp=15,conv=0.20,cuotas=(39,99,249),activ=[0.4,0.85,1.0])
print("precio medio/com:",round(PRECIO,3), " comision obra 35k:",tier_comm(35000))
R={}
for paq in (25,50):
  for n,S in (("PES",PES),("BASE",BASE),("OPT",OPT)):
    R[(n,paq)]=resumen(f"{n} paq{paq}",dict(S,paquete=paq))
# Pregunta 2: base paquete 50 y 25
for paq in (25,50):
    P=dict(BASE,paquete=paq)
    f,media,_=run(P)
    sin=dict(P,conv=0,concursos=0)  # sin programa de niveles (obras requieren nivel)
    _,media_sin,_=run(sin)
    print(f"\npaq{paq}: neto medio con niveles {media:.0f}, sin niveles {media_sin:.0f}, aporte {media-media_sin:.0f}")
    # hueco por profesionales de confianza: antes 1,5 €/com pagada/mes
    hueco=sum(1.5*x['com_pag']-x['red'] for x in f)/12
    arpu=sum(w*c for w,c in zip(P['mix_niv'],P['cuotas']))
    print(f"  hueco medio mensual vs 1,5€/com: {hueco:.0f} €; ARPU niveles {arpu:.1f}; neto de pago/connect ~{arpu*(1-0.015)-2:.1f}")
    hueco2=sum(1.5*x['com_pag']*(1-P['pct_red']) for x in f)/12; h2m12=1.5*f[-1]['com_pag']*(1-P['pct_red'])
    print(f'  HUECO B (1,5€ suponia 100% red): medio {hueco2:.0f} €/mes, mes12 {h2m12:.0f} -> subs mes12 {h2m12/(arpu*0.985-2):.0f}')
    print(f"  hueco mes12: {1.5*f[-1]['com_pag']-f[-1]['red']:.0f} € -> subs necesarios mes12 {(1.5*f[-1]['com_pag']-f[-1]['red'])/(arpu*0.985-2):.0f} ; subs que da el base mes12 {f[-1]['subs']:.0f}")
    # suscriptores necesarios para media 5000 (busqueda de conv)
    lo,hi=0,5
    for _ in range(40):
        mid=(lo+hi)/2
        if run(dict(P,conv=mid))[1]<5000: lo=mid
        else: hi=mid
    fx=run(dict(P,conv=hi))[0]
    print(f"  para media 5000: conv necesaria {hi*100:.1f}% -> subs mes12 {fx[-1]['subs']:.0f} ({fx[-1]['subs']/fx[-1]['desp']:.1f}/despacho)")
# Tornado base paq 50
print("\nTORNADO (base paq50, neto medio):")
P0=dict(BASE); b=run(P0)[1]; print("base",round(b))
tests=[('paquete',25,57),('nuevos_mes',2,4),('dto_todos',False,True),('averias',3,6),('ticket',200,350),('pct_red',0.08,0.25),
 ('conv',0.05,0.20),('pros_desp',8,15),('cuotas',(19,49,119),(39,99,249)),('concursos',0.03,0.10),('pct_conc',0.15,0.40),('lag_obra',9,4),('tax',0.25,0.15),('fijo',P0['fijo']+500,P0['fijo']-300),('mix_niv',(0.8,0.17,0.03),(0.4,0.4,0.2))]
out=[]
for k,lo,hi in tests:
    a=run(dict(P0,**{k:lo}))[1]; c=run(dict(P0,**{k:hi}))[1]; out.append((abs(c-a),k,lo,hi,a,c))
for d,k,lo,hi,a,c in sorted(out,reverse=True): print(f"{k:10s} {str(lo):18s}->{a:6.0f} | {str(hi):18s}->{c:6.0f}  rango {d:5.0f}")
# fundador a todos el año 1 y 25 paq
print("\nbase paq50 dto a todos:",round(run(dict(BASE,dto_todos=True))[1]))
print("base paq50 tax25:",round(run(dict(BASE,tax=0.25))[1]))
print("fijo",BASE['fijo'])
