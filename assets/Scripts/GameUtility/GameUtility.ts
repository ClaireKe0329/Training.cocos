export class GameUtility
{
    // Slot 盤面的 Reel 數量
    private static readonly _slotColumnCount: number = 5;
    // Slot 盤面每軸可見的 Symbol 數量
    private static readonly _slotRowCount: number = 3;
    // Reel 上下 Buffer 使用的 SlotUnit 總數
    private static readonly _reelBufferUnitCount: number = 2;

    // 取得 Slot 盤面的 Reel 數量
    public static GetSlotColumnCount(): number
    {
        return this._slotColumnCount;
    }

    // 取得 Slot 盤面每軸可見的 Symbol 數量
    public static GetSlotRowCount(): number
    {
        return this._slotRowCount;
    }

    // 取得 Reel 上下 Buffer 使用的 SlotUnit 總數
    public static GetReelBufferUnitCount(): number
    {
        return this._reelBufferUnitCount;
    }

    // 取得每軸 Reel 所需的 SlotUnit 總數
    public static GetReelSlotUnitCount(): number
    {
        return this._slotRowCount + this._reelBufferUnitCount;
    }
}
