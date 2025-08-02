"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Database,
  Link,
  Settings
} from "lucide-react";
import { blockchainService } from "@/lib/blockchain-service";
import { ORACLE_TYPES, ORACLE_TYPE_NAMES } from "@/lib/blockchain-constants";

interface CustomIndexDialogProps {
  onIndexCreated?: (indexId: number) => void;
  trigger?: React.ReactNode;
}

export function CustomIndexDialog({ onIndexCreated, trigger }: CustomIndexDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    initialValue: "",
    sourceUrl: "",
    oracleType: ORACLE_TYPES.MOCK.toString(),
    chainlinkOracleAddress: ""
  });

  // Clear messages when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form and messages when closing
      setTimeout(() => {
        setFormData({
          name: "",
          description: "",
          initialValue: "",
          sourceUrl: "",
          oracleType: ORACLE_TYPES.MOCK.toString(),
          chainlinkOracleAddress: ""
        });
        setSuccess(null);
        setError(null);
      }, 300);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Index name is required");
      return false;
    }
    if (!formData.initialValue || isNaN(Number(formData.initialValue)) || Number(formData.initialValue) <= 0) {
      setError("Initial value must be a positive number");
      return false;
    }
    if (!formData.sourceUrl.trim()) {
      setError("Source URL is required");
      return false;
    }
    if (formData.oracleType === "custom" && !formData.chainlinkOracleAddress.trim()) {
      setError("Chainlink oracle address is required for custom oracle option");
      return false;
    }
    return true;
  };

  const handleCreateIndex = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      // Determine oracle type and address
      let oracleType = parseInt(formData.oracleType);
      let chainlinkAddress = "0x0000000000000000000000000000000000000000";

      // For custom Chainlink oracle, we use CHAINLINK type but with specific address
      if (formData.oracleType === "custom") {
        oracleType = ORACLE_TYPES.CHAINLINK;
        chainlinkAddress = formData.chainlinkOracleAddress;
      }

      console.log(`🆕 Creating custom index:`, {
        name: formData.name,
        initialValue: parseInt(formData.initialValue),
        sourceUrl: formData.sourceUrl,
        oracleType,
        chainlinkAddress: chainlinkAddress !== "0x0000000000000000000000000000000000000000" ? chainlinkAddress : "default"
      });

      const result = await blockchainService.createIndexWithOracleType(
        formData.name,
        parseInt(formData.initialValue),
        formData.sourceUrl,
        oracleType
      );

      if (result.success && result.indexId) {
        const oracleTypeName = formData.oracleType === "custom" 
          ? "Chainlink (Custom Address)" 
          : ORACLE_TYPE_NAMES[oracleType as keyof typeof ORACLE_TYPE_NAMES];
        
        setSuccess(`✅ Successfully created "${formData.name}" with ID ${result.indexId} using ${oracleTypeName}!`);
        
        // Notify parent component
        if (onIndexCreated) {
          onIndexCreated(result.indexId);
        }

        // Auto-close dialog after success
        setTimeout(() => {
          setIsOpen(false);
        }, 3000);

      } else {
        throw new Error(result.error || "Failed to create index");
      }

    } catch (err) {
      console.error("❌ Error creating custom index:", err);
      setError(`Failed to create index: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getOracleDescription = (type: string) => {
    switch (type) {
      case ORACLE_TYPES.MOCK.toString():
        return "Manual data updates - perfect for testing and custom data sources";
      case ORACLE_TYPES.CHAINLINK.toString():
        return "Automated data from Chainlink Functions - reliable external data feeds";
      case "custom":
        return "Use a specific Chainlink oracle address for specialized data sources";
      default:
        return "";
    }
  };

  const getOracleIcon = (type: string) => {
    switch (type) {
      case ORACLE_TYPES.MOCK.toString():
        return <Database className="w-4 h-4 text-blue-500" />;
      case ORACLE_TYPES.CHAINLINK.toString():
        return <Link className="w-4 h-4 text-orange-500" />;
      case "custom":
        return <Settings className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Index
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Custom Index
          </DialogTitle>
          <DialogDescription>
            Create a new blockchain index with your choice of data source and oracle type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Index Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Index Information</CardTitle>
              <CardDescription>Basic details about your custom index</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Index Name*</Label>
                <Input
                  id="name"
                  placeholder="e.g., My Custom Stock Index"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this index tracks and represents"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="initialValue">Initial Value*</Label>
                <Input
                  id="initialValue"
                  type="number"
                  min="1"
                  placeholder="e.g., 10000"
                  value={formData.initialValue}
                  onChange={(e) => handleInputChange("initialValue", e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Starting value for your index (must be positive)
                </p>
              </div>

              <div>
                <Label htmlFor="sourceUrl">Source URL*</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  placeholder="https://api.example.com/data"
                  value={formData.sourceUrl}
                  onChange={(e) => handleInputChange("sourceUrl", e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL where the index data originates from
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Oracle Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Oracle Type Selection</CardTitle>
              <CardDescription>Choose how your index data will be updated</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.oracleType}
                onValueChange={(value) => handleInputChange("oracleType", value)}
                className="space-y-4"
              >
                {/* Mock Oracle Option */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={ORACLE_TYPES.MOCK.toString()} id="mock" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getOracleIcon(ORACLE_TYPES.MOCK.toString())}
                      <Label htmlFor="mock" className="font-medium">Mock Oracle</Label>
                      <Badge variant="secondary" className="text-xs">Manual</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {getOracleDescription(ORACLE_TYPES.MOCK.toString())}
                    </p>
                  </div>
                </div>

                {/* Chainlink Oracle Option */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={ORACLE_TYPES.CHAINLINK.toString()} id="chainlink" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getOracleIcon(ORACLE_TYPES.CHAINLINK.toString())}
                      <Label htmlFor="chainlink" className="font-medium">Chainlink Functions</Label>
                      <Badge variant="default" className="text-xs">Automated</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {getOracleDescription(ORACLE_TYPES.CHAINLINK.toString())}
                    </p>
                  </div>
                </div>

                {/* Custom Chainlink Oracle Option */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getOracleIcon("custom")}
                      <Label htmlFor="custom" className="font-medium">Custom Chainlink Oracle</Label>
                      <Badge variant="outline" className="text-xs">Advanced</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {getOracleDescription("custom")}
                    </p>
                    
                    {formData.oracleType === "custom" && (
                      <div className="mt-3">
                        <Label htmlFor="chainlinkAddress" className="text-sm">Chainlink Oracle Address*</Label>
                        <Input
                          id="chainlinkAddress"
                          placeholder="0x..."
                          value={formData.chainlinkOracleAddress}
                          onChange={(e) => handleInputChange("chainlinkOracleAddress", e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Contract address of the specific Chainlink oracle to use
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateIndex}
              disabled={isCreating || !!success}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Index...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Created Successfully
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Index
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}