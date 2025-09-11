import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit3, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

const COLOR_OPTIONS = [
  { name: 'Green', value: '#10b981', bg: 'bg-green-500' },
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Purple', value: '#8b5cf6', bg: 'bg-purple-500' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500' },
  { name: 'Red', value: '#ef4444', bg: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-500' },
  { name: 'Yellow', value: '#eab308', bg: 'bg-yellow-500' },
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-500' },
  { name: 'Gray', value: '#6b7280', bg: 'bg-gray-500' },
];

export function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    color: '#10b981'
  });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Tag name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: formData.name.trim(),
          color: formData.color
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Error",
            description: "A tag with this name already exists",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ name: '', color: '#10b981' });
      
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (updatedData: { name: string; color: string }) => {
    if (!editingTag) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .update({
          name: updatedData.name.trim(),
          color: updatedData.color
        })
        .eq('id', editingTag.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Error",
            description: "A tag with this name already exists",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setTags(prev => 
        prev.map(tag => tag.id === editingTag.id ? data : tag)
           .sort((a, b) => a.name.localeCompare(b.name))
      );
      
      setIsEditDialogOpen(false);
      setEditingTag(null);
      
      toast({
        title: "Success",
        description: "Tag updated successfully",
      });
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: "Error",
        description: "Failed to update tag",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      setTags(prev => prev.filter(tag => tag.id !== tagId));
      
      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  const getColorOption = (colorValue: string) => {
    return COLOR_OPTIONS.find(option => option.value === colorValue) || COLOR_OPTIONS[0];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Tags</h1>
        <p className="text-gray-600 text-sm">Organize and categorize your content with tags</p>
      </div>

      {/* Create Tag Form */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create Tag</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tag, category, or label name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Select 
                value={formData.color} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: formData.color }}
                      />
                      <span>{getColorOption(formData.color).name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: option.value }}
                        />
                        <span>{option.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Tags List */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tags</h2>
        {tags.length > 0 ? (
          <div className="space-y-3">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium text-gray-900">{tag.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(tag)}
                    className="flex items-center space-x-1"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tag.id)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No tags found. Create your first tag above.</p>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          {editingTag && (
            <EditTagForm
              tag={editingTag}
              onUpdate={handleUpdate}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditTagFormProps {
  tag: Tag;
  onUpdate: (data: { name: string; color: string }) => void;
  onCancel: () => void;
}

function EditTagForm({ tag, onUpdate, onCancel }: EditTagFormProps) {
  const [formData, setFormData] = useState({
    name: tag.name,
    color: tag.color
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onUpdate(formData);
  };

  const getColorOption = (colorValue: string) => {
    return COLOR_OPTIONS.find(option => option.value === colorValue) || COLOR_OPTIONS[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-name">Name</Label>
        <Input
          id="edit-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="edit-color">Color</Label>
        <Select 
          value={formData.color} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: formData.color }}
                />
                <span>{getColorOption(formData.color).name}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: option.value }}
                  />
                  <span>{option.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}