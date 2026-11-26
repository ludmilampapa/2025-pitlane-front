"use client";
import { useState } from "react";
import { AdminFoodForm } from "./AdminFoodForm";
import { AdminCatalogManager } from "./AdminCatalogManager";
import { FoodFormModal } from "@/components/food/forms/FoodFormModal";
import { EditFoodForm } from "./EditForm";
import { FoodCard } from "@/components/food/food-cards";
import { FoodModal } from "@/components/modals";
import { useFoods, Food } from "@/lib/contexts/FoodsContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


export function AdminSection() {
  const { foods } = useFoods();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const handleEditClick = (food: Food) => {
    setSelectedFood(food);
    setShowEditModal(true);
  };

  const handleViewClick = (food: Food) => {
    setSelectedFood(food);
    setShowViewModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedFood(null);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedFood(null);
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminCatalogManager
          title="Dietary Restrictions"
          description="Global allergen and dietary restriction tags available across profiles, foods, and voting."
          endpoint="/dietary-restrictions"
          idField="DietaryRestrictionID"
          placeholder="e.g. Soy Free"
          protectedIds={[0]}
        />
        <AdminCatalogManager
          title="Preferences"
          description="Global taste and cuisine preference tags used for personalized recommendations."
          endpoint="/preferences"
          idField="PreferenceID"
          placeholder="e.g. Comfort Food"
        />
      </div>

      <AdminFoodForm onAddClick={() => setShowAddModal(true)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {foods.map((food) => (
          <FoodCard
            key={food.FoodID}
            food={food}
            variant="editable"
            onCardClick={handleViewClick}
            onEditClick={handleEditClick}
            isOwner={true} // Admin can edit all foods
          />
        ))}
      </div>

      {/* MODAL: Agregar comida */}
      <FoodFormModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        mode="create"
      />

      {/* MODAL: Ver comida */}
      <FoodModal
        food={selectedFood}
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
      />

      {/* MODAL: Editar comida - Using EditForm with Korven integration */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[600px] border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Edit Food
            </DialogTitle>
          </DialogHeader>
          {selectedFood && (
            <EditFoodForm
              food={selectedFood}
              onSuccess={handleCloseEditModal}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
