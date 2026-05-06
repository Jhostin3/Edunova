import{r as e}from"./chunk-DECur_0Z.js";import{n as t,t as n}from"./jsx-runtime-CP2iHdEU.js";import{r}from"./index-Bi8JBEUJ.js";import{t as i}from"./EmptyState-BQGUmmxk.js";import{t as a}from"./PageHeader-6ecuzQJ1.js";import{t as o}from"./DataTable-C4133ZPZ.js";var s=e(t(),1);async function c(){let{data:e,error:t}=await r.from(`tarjetas_nfc`).select(`
      id,
      uid_nfc,
      estudiante_id,
      fecha_asignacion,
      is_active,
      created_at,
      estudiante:estudiantes (
        id,
        nombres,
        apellidos
      )
    `).order(`created_at`,{ascending:!1});return{data:e??[],error:t}}var l=n();function u(){let[e,t]=(0,s.useState)([]),[n,r]=(0,s.useState)(!0),[u,d]=(0,s.useState)(``);async function f(){r(!0),d(``);let{data:e,error:n}=await c();n?(d(n.message),t([])):t(e),r(!1)}return(0,s.useEffect)(()=>{let e=setTimeout(()=>{f()},0);return()=>clearTimeout(e)},[]),(0,l.jsxs)(`div`,{className:`space-y-6`,children:[(0,l.jsx)(a,{title:`Tarjetas NFC`,description:`Consulta las asignaciones NFC existentes. El registro y actualizacion del UID se realizara desde el kiosko NFC.`}),u?(0,l.jsx)(`div`,{className:`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700`,children:u}):null,e.length||n?(0,l.jsx)(o,{columns:[{key:`id`,label:`ID`},{key:`uid_nfc`,label:`UID NFC`},{key:`estudiante`,label:`Estudiante`,render:e=>e.estudiante?`${e.estudiante.nombres} ${e.estudiante.apellidos}`:e.estudiante_id||`-`},{key:`fecha_asignacion`,label:`Fecha asignacion`,render:e=>e.fecha_asignacion||`-`},{key:`is_active`,label:`Estado`,render:e=>(0,l.jsx)(`span`,{className:`rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700`,children:e.is_active?`Activa`:`Inactiva`})}],rows:e,loading:n,emptyMessage:`No hay tarjetas NFC registradas.`}):(0,l.jsx)(i,{title:`Aun no hay tarjetas NFC`,description:`Todavia no hay asignaciones NFC registradas desde el kiosko.`})]})}export{u as TarjetasPage};