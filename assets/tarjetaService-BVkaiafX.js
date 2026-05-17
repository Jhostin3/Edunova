import{r as e}from"./index-CCITJ0gF.js";async function t(){let{data:t,error:n}=await e.from(`tarjetas_nfc`).select(`
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
    `).order(`created_at`,{ascending:!1});return{data:t??[],error:n}}async function n(t){if(!t)return{data:[],error:null};let{data:n,error:r}=await e.from(`tarjetas_nfc`).select(`
      id,
      uid_nfc,
      estudiante_id,
      fecha_asignacion,
      fecha_desactivacion,
      is_active,
      notas,
      created_at
    `).eq(`estudiante_id`,t).order(`fecha_asignacion`,{ascending:!1});return{data:n??[],error:r}}export{n,t};