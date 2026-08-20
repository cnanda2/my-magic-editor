import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome</h1>
      <p className="text-gray-500">Select a board from the menu to get started.</p>
    </div>
  );
}
