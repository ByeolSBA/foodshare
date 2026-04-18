import { useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { DonationCardFinal as DonationCard } from "../components/DonationCardFinal";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function DonorHistory() {
  const navigate = useNavigate();
  const { currentUser, donations } = useStore();

  const myHistory = donations.filter(
    (d) => d.donorId === currentUser?.id && d.status !== "available",
  );

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to="/donor" className="mr-4 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Historial de Donaciones
        </h1>
      </div>

      {myHistory.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myHistory.map((donation) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              showStatus={true}
              actions={
                donation.claimedBy
                  ? [
                      {
                        label: "Contactar",
                        onClick: () =>
                          navigate(
                            `/chat/${donation.claimedBy}?donationId=${donation.id}`,
                          ),
                        variant: "primary",
                      },
                    ]
                  : []
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">No tienes donaciones pasadas aún.</p>
        </div>
      )}
    </div>
  );
}
