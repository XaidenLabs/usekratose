import { evidencePrinciples } from "@/constants";
import React from "react";

const CompanyLogos = ({ className }: { className: string }) => {
  return (
    <div className={className}>
      <h5 className="tagline mb-6 text-center text-n-1/50">
        Security conclusions grounded in
      </h5>
      <ul className="flex">
        {evidencePrinciples.map((principle) => (
          <li key={principle} className="flex h-[8.5rem] flex-1 items-center justify-center px-4 text-center font-code text-xs font-semibold uppercase tracking-wider text-n-3">
            {principle}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CompanyLogos;
