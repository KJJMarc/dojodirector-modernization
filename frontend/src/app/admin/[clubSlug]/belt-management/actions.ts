"use server";

import {
  createBeltSystemAction as createBeltSystemActionBase,
  createBeltSystemLevelAction as createBeltSystemLevelActionBase,
  deleteBeltSystemLevelAction as deleteBeltSystemLevelActionBase,
  saveBeltLevelDetailsAction as saveBeltLevelDetailsActionBase,
  setBeltSystemLevelActiveAction as setBeltSystemLevelActiveActionBase,
  updateAdultBeltRequirementAction as updateAdultBeltRequirementActionBase,
  updateBeltSystemLevelAction as updateBeltSystemLevelActionBase,
  updateJuniorBeltRequirementAction as updateJuniorBeltRequirementActionBase,
} from "@/app/admin/[clubSlug]/belts/actions";

export async function createBeltSystemAction(formData: FormData) {
  return createBeltSystemActionBase(formData);
}

export async function createBeltSystemLevelAction(formData: FormData) {
  return createBeltSystemLevelActionBase(formData);
}

export async function deleteBeltSystemLevelAction(formData: FormData) {
  return deleteBeltSystemLevelActionBase(formData);
}

export async function saveBeltLevelDetailsAction(formData: FormData) {
  return saveBeltLevelDetailsActionBase(formData);
}

export async function setBeltSystemLevelActiveAction(formData: FormData) {
  return setBeltSystemLevelActiveActionBase(formData);
}

export async function updateAdultBeltRequirementAction(formData: FormData) {
  return updateAdultBeltRequirementActionBase(formData);
}

export async function updateBeltSystemLevelAction(formData: FormData) {
  return updateBeltSystemLevelActionBase(formData);
}

export async function updateJuniorBeltRequirementAction(formData: FormData) {
  return updateJuniorBeltRequirementActionBase(formData);
}
