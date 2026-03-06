import {useEffect,useState} from "react";
import api from "../api/api";
export default function useFetch(url){
 const [data,setData]=useState([]);
 const load=async()=>{
  const res=await api.get(url);
  setData(res.data);
 };
 useEffect(()=>{load();},[url]);
 return {data,load};
}