'use client'

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Popup from "@/components/Popup";

export default function Login() {
  const { address } = useAccount();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    console.log(address)
    if (address) {
      openPopup();
    }
  }, [address])

  const openPopup = () => {
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <div className="h-[100vh] flex flex-col items-center justify-center gap-8">
      <h1 className="text-3xl font-bold">Make your NFTs popular by frames</h1>
      <p className="text-xl">First, login into our service</p>

      <ConnectButton label="Login" accountStatus={"address"} chainStatus={"none"} />

      {isPopupOpen && <Popup onClose={closePopup} />}
      
    </div>
  )
}