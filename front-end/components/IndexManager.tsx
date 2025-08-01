/**
 * 📊 Index Management Component
 * 
 * This component allows users to view, create, and update blockchain indices
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useBlockchain } from '@/hooks/useBlockchain';
import { WalletConnect } from '@/components/WalletConnect';

interface IndexManagerProps {
  className?: string;
  showCreateButton?: boolean;
  onIndexSelect?: (indexId: number) => void;
}

export function IndexManager({ 
  className = '', 
  showCreateButton = true,
  onIndexSelect 
}: IndexManagerProps) {
  const {
    isConnected,
    indices,
    isLoading,
    error,
    createIndex,
    updateIndex,
    refreshIndices,
    clearError
  } = useBlockchain();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedIndexId, setSelectedIndexId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    initialValue: ''
  });
  const [updateValue, setUpdateValue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreateIndex = async () => {
    if (!createForm.name || !createForm.description || !createForm.initialValue) {
      return;
    }

    try {
      setActionLoading(true);
      const indexId = await createIndex(
        createForm.name,
        createForm.description,
        parseInt(createForm.initialValue)
      );
      
      console.log('✅ Index created with ID:', indexId);
      setIsCreateDialogOpen(false);
      setCreateForm({ name: '', description: '', initialValue: '' });
    } catch (err) {
      console.error('❌ Failed to create index:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateIndex = async () => {
    if (!selectedIndexId || !updateValue) return;

    try {
      setActionLoading(true);
      await updateIndex(selectedIndexId, parseInt(updateValue));
      
      console.log('✅ Index updated');
      setIsUpdateDialogOpen(false);
      setUpdateValue('');
      setSelectedIndexId(null);
    } catch (err) {
      console.error('❌ Failed to update index:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const openUpdateDialog = (indexId: number, currentValue: number) => {
    setSelectedIndexId(indexId);
    setUpdateValue(currentValue.toString());
    setIsUpdateDialogOpen(true);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatValue = (value: number) => {
    return value.toLocaleString();
  };

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Index Management</CardTitle>
        </CardHeader>
        <CardContent>
          <WalletConnect />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Blockchain Indices</span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshIndices}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {showCreateButton && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Index
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Index</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="index-name">Index Name</Label>
                      <Input
                        id="index-name"
                        placeholder="e.g., AAPL Stock Price"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="index-description">Description</Label>
                      <Textarea
                        id="index-description"
                        placeholder="e.g., Apple Inc. stock price in USD cents"
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="initial-value">Initial Value</Label>
                      <Input
                        id="initial-value"
                        type="number"
                        placeholder="e.g., 17500 (for $175.00)"
                        value={createForm.initialValue}
                        onChange={(e) => setCreateForm({ ...createForm, initialValue: e.target.value })}
                      />
                    </div>
                    <Button 
                      onClick={handleCreateIndex}
                      disabled={actionLoading || !createForm.name || !createForm.description || !createForm.initialValue}
                      className="w-full"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create Index
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2" 
                onClick={clearError}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {indices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No indices found</p>
            <p className="text-sm">Create your first index to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {indices.map((index) => (
              <Card 
                key={index.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  onIndexSelect ? 'hover:border-blue-300' : ''
                }`}
                onClick={() => onIndexSelect?.(index.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {index.name || `Index ${index.id}`}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          ID: {index.id}
                        </Badge>
                        {index.active && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      {index.description && (
                        <p className="text-xs text-gray-600 mb-2">{index.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Value: {formatValue(index.value)}</span>
                        <span>Updated: {formatTimestamp(index.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-mono">
                        {formatValue(index.value)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openUpdateDialog(index.id, index.value);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Update Index Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Index Value</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-value">New Value</Label>
                <Input
                  id="new-value"
                  type="number"
                  placeholder="Enter new value"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleUpdateIndex}
                disabled={actionLoading || !updateValue}
                className="w-full"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Update Index
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default IndexManager;